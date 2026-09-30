from flask import Blueprint, jsonify, request, current_app
from app import db
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.commerce import EscrowTransaction
from app.models.user import User
from app.schemas.order import order_schema, orders_schema
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.orm import selectinload
from sqlalchemy import func
import uuid
import os
import datetime
import base64
import requests
import logging
from app.services.escrow import (
    cancel_unpaid_order,
    fund_escrow,
    get_or_create_escrow,
    release_reserved_stock,
)
from app.utils.mpesa import get_mpesa_access_token
from app.utils.http import json_object
from app.utils.sms import send_order_status_sms, send_payment_confirmation_sms
from app.utils.whatsapp import send_order_status_whatsapp, send_payment_confirmation_whatsapp


orders_bp = Blueprint('orders', __name__)
logger = logging.getLogger(__name__)


@orders_bp.route('/completed/check', methods=['GET'])
@jwt_required()
def check_completed_orders():
    user_id = int(get_jwt_identity())
    has_completed = Order.query.filter_by(
        buyer_id=user_id, status='delivered'
    ).first() is not None
    return jsonify({'has_completed_orders': has_completed}), 200


@orders_bp.route('/', methods=['GET'])
@jwt_required()
def get_orders():
    user_id = int(get_jwt_identity())
    user = db.get_or_404(User, user_id)

    # Check explicit query parameter, or fall back to logged-in user's role
    role = request.args.get('role', user.role)

    # orders_schema nests transport_quote, escrow_transaction and receipt
    # (schemas/order.py). Without eager-loading them, marshmallow lazy-loads
    # each one per row: 20 orders cost 3 extra SELECTs each, so a single page
    # of 100 issued 306 queries. These three lines take it to 9.
    eager_loads = (
        selectinload(Order.items).selectinload(OrderItem.product),
        selectinload(Order.buyer),
        selectinload(Order.farmer),
        selectinload(Order.transport_quote),
        selectinload(Order.escrow_transaction),
        selectinload(Order.receipt),
    )

    if role == 'farmer':
        base_q = Order.query.options(*eager_loads).filter_by(farmer_id=user_id)
    elif role == 'buyer':
        base_q = Order.query.options(*eager_loads).filter_by(buyer_id=user_id)
    else:
        # Fallback: Return all orders linked to this account
        base_q = (
            Order.query.options(*eager_loads)
            .filter((Order.buyer_id == user_id) | (Order.farmer_id == user_id))
        )

    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    pagination = base_q.order_by(Order.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        'items': orders_schema.dump(pagination.items),
        'total': pagination.total,
        'page': page,
        'pages': pagination.pages,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev,
    }), 200


@orders_bp.route('/<int:order_id>', methods=['GET'])
@jwt_required()
def get_order(order_id):
    user_id = int(get_jwt_identity())
    user = db.get_or_404(User, user_id)

    order = db.session.get(
        Order, order_id,
        options=[
            selectinload(Order.items).selectinload(OrderItem.product),
            selectinload(Order.buyer),
            selectinload(Order.farmer),
            # order_schema nests these three; marshmallow otherwise lazy-loads
            # each one separately (3 extra queries per order).
            selectinload(Order.transport_quote),
            selectinload(Order.escrow_transaction),
            selectinload(Order.receipt),
        ]
    )
    if order is None:
        return jsonify({'message': 'Order not found'}), 404

    # Access control: only buyer or farmer on this order can view
    is_participant = (order.buyer_id == user_id) or (order.farmer_id == user_id) or user.is_privileged
    if not is_participant:
        return jsonify({'message': 'Unauthorized'}), 403

    return order_schema.jsonify(order), 200


@orders_bp.route('/counterparties', methods=['GET'])
@jwt_required()
def list_counterparties():
    """Trading partners of the caller, with the contact details of those orders.

    Replaces the old client directory, which let any signed-in account read the
    email and phone number of every user on the platform. A farmer has a
    legitimate need to see who they have actually traded with, so this scopes
    the lookup to the caller's own orders and returns full contact fields only
    for genuine counterparties.
    """
    user_id = int(get_jwt_identity())
    user = db.get_or_404(User, user_id)

    if user.role == 'farmer':
        counterparty_id = Order.farmer_id
        other_id = Order.buyer_id
    elif user.role == 'buyer':
        counterparty_id = Order.buyer_id
        other_id = Order.farmer_id
    else:
        # Admins have no trading counterparties of their own.
        return jsonify({'items': [], 'total': 0}), 200

    rows = (
        db.session.query(
            User,
            func.count(Order.id).label('order_count'),
            func.coalesce(func.sum(Order.total_amount), 0.0).label('total_value'),
            func.max(Order.created_at).label('last_order_at'),
        )
        .join(Order, other_id == User.id)
        .filter(counterparty_id == user_id)
        .group_by(User.id)
        .order_by(func.max(Order.created_at).desc())
        .all()
    )

    items = [
        {
            'id': partner.id,
            'username': partner.username,
            'email': partner.email,
            'role': partner.role,
            'location': partner.location or '',
            'phone_number': partner.phone_number or '',
            'order_count': order_count,
            'total_value': round(float(total_value), 2),
            'last_order_at': last_order_at.isoformat() if last_order_at else None,
        }
        for partner, order_count, total_value, last_order_at in rows
    ]

    return jsonify({'items': items, 'total': len(items)}), 200


@orders_bp.route('/', methods=['POST'])
@jwt_required()
def place_order():
    buyer_id = int(get_jwt_identity())

    buyer_user = db.get_or_404(User, buyer_id)
    if buyer_user.role != 'buyer':
        return jsonify({'message': 'Only buyer accounts can place orders'}), 403

    data, error = json_object()
    if error:
        return error
    items_data = data.get('items', [])
    if not items_data:
        return jsonify({'message': 'Order must contain at least one item'}), 400

    if not all(
        isinstance(item, dict) and item.get('product_id') is not None for item in items_data
    ):
        return jsonify({'message': 'Each order item requires a product_id and quantity'}), 400
    first_product = (
        Product.query.filter_by(id=items_data[0]['product_id'])
        .with_for_update()
        .first_or_404()
    )
    farmer_id = first_product.farmer_id
    if farmer_id == buyer_id:
        return jsonify({'message': 'You cannot place an order for your own product'}), 400

    total_amount = 0.0
    compiled_items = []

    # Process inventory items to calculate total amounts and reduce stock weight parameters
    locked_products = {}
    for item in items_data:
        product = (
            Product.query.filter_by(id=item['product_id'])
            .with_for_update()
            .first_or_404()
        )
        locked_products[product.id] = product
        try:
            qty = float(item.get('quantity'))
        except (TypeError, ValueError):
            return jsonify({'message': 'Item quantity must be a positive number'}), 400
        if qty <= 0:
            return jsonify({'message': 'Item quantity must be greater than zero'}), 400
        if product.farmer_id != farmer_id:
            return jsonify({'message': 'An order can only contain products from one farmer'}), 400
        if not product.is_available:
            return jsonify({'message': f'Product {product.title} is unavailable'}), 400

        if product.stock_quantity < qty:
            return jsonify({'message': f'Insufficient stock for product {product.title}'}), 400

        product.stock_quantity -= qty
        subtotal = product.price_per_unit * qty
        total_amount += subtotal

        compiled_items.append(
            OrderItem(product_id=product.id, quantity=qty, unit_price=product.price_per_unit)
        )

    # Clean phone numbers to strict 2547XXXXXXXX or 2541XXXXXXXX formats required by Safaricom
    raw_phone = str(data.get('contact_phone', '')).strip().replace('+', '').replace(' ', '')
    if raw_phone.startswith('0'):
        cleaned_phone = '254' + raw_phone[1:]
    elif raw_phone.startswith('7') or raw_phone.startswith('1'):
        cleaned_phone = '254' + raw_phone
    else:
        cleaned_phone = raw_phone
    if len(cleaned_phone) != 12 or not cleaned_phone.startswith(('2541', '2547')) or not cleaned_phone.isdigit():
        return jsonify({'message': 'A valid Kenyan M-Pesa phone number is required'}), 400

    new_order = Order(
        order_code=f"ACR-{uuid.uuid4().hex[:6].upper()}",
        buyer_id=buyer_id,
        farmer_id=farmer_id,
        total_amount=total_amount,
        status="pending",
        payment_status="unpaid",
        delivery_address=data.get('delivery_address', 'Fulfillment Warehouse, Nairobi'),
        contact_phone=cleaned_phone,
        items=compiled_items,
    )

    try:
        db.session.add(new_order)
        # Persist the order and reservation before calling Daraja. The asynchronous
        # callback may arrive immediately and must be able to find the checkout row.
        db.session.flush()
        escrow = get_or_create_escrow(new_order)

        token = get_mpesa_access_token()
        if not token:
            raise RuntimeError('Unable to authenticate with M-Pesa')
        if not os.getenv('MPESA_PASSKEY'):
            raise RuntimeError('M-Pesa passkey is not configured')

        env = os.getenv('MPESA_ENV', 'sandbox')
        base_url = (
            "https://sandbox.safaricom.co.ke"
            if env == "sandbox"
            else "https://api.safaricom.co.ke"
        )
        timestamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d%H%M%S')
        password = base64.b64encode(
            f"{os.getenv('MPESA_SHORTCODE', '174379')}{os.getenv('MPESA_PASSKEY', '')}{timestamp}".encode()
        ).decode('utf-8')
        stk_payload = {
            "BusinessShortCode": os.getenv('MPESA_SHORTCODE', '174379'),
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": int(new_order.total_amount),
            "PartyA": cleaned_phone,
            "PartyB": os.getenv('MPESA_SHORTCODE', '174379'),
            "PhoneNumber": cleaned_phone,
            "CallBackURL": current_app.config['MPESA_CALLBACK_URL'],
            "AccountReference": f"ACR{new_order.id}",
            "TransactionDesc": "Acreage Marketplace Escrow Purchase",
        }
        escrow.status = 'payment_started'
        db.session.commit()

        response = requests.post(
            f"{base_url}/mpesa/stkpush/v1/processrequest",
            json=stk_payload,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            timeout=15,
        )
        response.raise_for_status()
        stk_response = response.json()
        checkout_request_id = stk_response.get('CheckoutRequestID')
        if stk_response.get('ResponseCode') != 0 or not checkout_request_id:
            raise RuntimeError(stk_response.get('ResponseDescription') or 'M-Pesa rejected the STK request')
        escrow.checkout_request_id = checkout_request_id
        escrow.provider_transaction_id = stk_response.get('MerchantRequestID')
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        logger.exception('Order creation failed', extra={'buyer_id': buyer_id})
        order_id = new_order.id if 'new_order' in locals() else None
        if order_id:
            # A callback may beat our exception handler. Re-lock and only cancel
            # the order if payment has not already completed.
            failed_order = (
                Order.query.filter_by(id=order_id).with_for_update().first()
            )
            if failed_order:
                failed_escrow = get_or_create_escrow(failed_order)
                cancel_unpaid_order(failed_order, failed_escrow, failed=True)
                db.session.commit()
        return jsonify({'message': 'Unable to start M-Pesa payment. Please try again.'}), 502

    return order_schema.jsonify(new_order), 201


@orders_bp.route('/<int:order_id>/status', methods=['PATCH'])
@jwt_required()
def update_order_status(order_id):
    order = db.session.get(
        Order, order_id,
        options=[
            selectinload(Order.items).selectinload(OrderItem.product),
            selectinload(Order.buyer),
            selectinload(Order.farmer),
            # order_schema nests these three; marshmallow otherwise lazy-loads
            # each one separately (3 extra queries per order).
            selectinload(Order.transport_quote),
            selectinload(Order.escrow_transaction),
            selectinload(Order.receipt),
        ]
    )
    if order is None:
        return jsonify({'message': 'Order not found'}), 404
    user_id = int(get_jwt_identity())
    user = db.get_or_404(User, user_id)
    if user.role != 'farmer' or order.farmer_id != user_id:
        return jsonify({'message': 'Only the order farmer can update its status'}), 403
    data, error = json_object()
    if error:
        return error
    new_status = data.get('status')

    valid_statuses = ['pending', 'on delivery', 'delivered', 'cancelled']
    if not new_status or new_status.lower() not in valid_statuses:
        return jsonify({'message': 'Invalid order status parameter'}), 400

    new_status = new_status.lower()
    if order.status == 'delivered' or order.status == 'cancelled':
        return jsonify({'message': 'Delivered or cancelled orders cannot be changed'}), 409
    if new_status == 'cancelled':
        escrow = getattr(order, 'escrow_transaction', None)
        if escrow and escrow.status in {'funded', 'disputed'}:
            return jsonify({'message': 'Funded escrow must be resolved before cancellation'}), 409
        if escrow:
            release_reserved_stock(order, escrow)
            if escrow.status in {'pending', 'payment_started'}:
                escrow.status = 'cancelled'
        logger.info('Order cancelled and stock released', extra={'order_id': order.id})

    old_status = order.status
    order.status = new_status
    db.session.commit()

    # Send SMS notification for status change
    try:
        send_order_status_sms(order, new_status)
    except Exception as sms_error:
        logger.exception('Failed to send order status SMS', extra={'order_id': order.id})

    # Send WhatsApp notification for status change
    try:
        send_order_status_whatsapp(order, new_status)
    except Exception as whatsapp_error:
        logger.exception('Failed to send order status WhatsApp', extra={'order_id': order.id})

    return order_schema.jsonify(order), 200


# BUYER-INITIATED M-PESA PAYMENT ENDPOINT
@orders_bp.route('/<int:order_id>/pay', methods=['POST'])
@jwt_required()
def initiate_order_payment(order_id):
    """
    Allows a buyer to trigger (or re-trigger) an M-Pesa STK push for an unpaid order.
    Called from the Orders page when the buyer clicks "Pay via M-Pesa".
    """
    buyer_id = int(get_jwt_identity())
    order = (
        Order.query.filter_by(id=order_id).with_for_update().first_or_404()
    )

    if order.buyer_id != buyer_id:
        return (
            jsonify(
                {'message': 'Unauthorized: only the buyer can initiate payment for this order'}
            ),
            403,
        )

    if order.payment_status == 'paid':
        return jsonify({'message': 'This order has already been paid'}), 409

    if order.status == 'cancelled':
        return jsonify({'message': 'Cannot pay for a cancelled order'}), 409

    phone = order.contact_phone
    if not phone:
        return (
            jsonify({'message': 'No phone number on file for this order. Please contact support.'}),
            400,
        )

    token = get_mpesa_access_token()
    if not token:
        return (
            jsonify(
                {'message': 'M-Pesa service temporarily unavailable. Please try again shortly.'}
            ),
            503,
        )

    env = os.getenv('MPESA_ENV', 'sandbox')
    base_url = (
        "https://sandbox.safaricom.co.ke" if env == "sandbox" else "https://api.safaricom.co.ke"
    )
    timestamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d%H%M%S')
    shortcode = os.getenv('MPESA_SHORTCODE', '174379')
    passkey = os.getenv('MPESA_PASSKEY', '')
    if not passkey:
        return jsonify({'message': 'M-Pesa service is not configured.'}), 503
    password = base64.b64encode(f"{shortcode}{passkey}{timestamp}".encode()).decode('utf-8')

    stk_payload = {
        "BusinessShortCode": shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": max(1, int(order.total_amount)),
        "PartyA": phone,
        "PartyB": shortcode,
        "PhoneNumber": phone,
        "CallBackURL": current_app.config['MPESA_CALLBACK_URL'],
        "AccountReference": f"ACR{order.id}",
        "TransactionDesc": f"Acreage Order {order.order_code}",
    }

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    try:
        resp = requests.post(
            f"{base_url}/mpesa/stkpush/v1/processrequest",
            json=stk_payload,
            headers=headers,
            timeout=15,
        )
        resp.raise_for_status()
        resp_data = resp.json()
        checkout_request_id = str(resp_data.get('CheckoutRequestID') or '').strip()
        response_code = str(resp_data.get('ResponseCode', ''))

        if response_code == '0' and checkout_request_id:
            escrow = get_or_create_escrow(order)
            escrow.checkout_request_id = checkout_request_id
            escrow.provider_transaction_id = resp_data.get('MerchantRequestID')
            escrow.status = 'payment_started'
            db.session.commit()
            logger.info(
                'STK push triggered',
                extra={'order_id': order.id, 'checkout_id': checkout_request_id},
            )
            return (
                jsonify(
                    {
                        'message': (
                            'M-Pesa payment prompt sent to your phone. Enter your PIN to complete.'
                        ),
                        'checkout_request_id': checkout_request_id,
                    }
                ),
                200,
            )
        else:
            error_message = (
                resp_data.get('errorMessage')
                or resp_data.get('ResponseDescription')
                or 'M-Pesa request failed'
            )
            logger.error('STK push rejected', extra={'order_id': order.id, 'response': resp_data})
            return jsonify({'message': error_message}), 400

    except requests.RequestException:
        logger.exception('M-Pesa STK request failed', extra={'order_id': order.id})
        return jsonify({'message': 'Network error reaching M-Pesa gateway. Please try again.'}), 503


# MPESA CALLBACKS ENDPOINT
@orders_bp.route('/mpesa-callback', methods=['POST'])
def mpesa_callback():
    """.
    Asynchronous WEbhook listening for safaricom Daraja STK push processing results.
    This route is public  (no@jwt_required) becoz it is called external by safaricom.
    """

    stk_callback_response, error = json_object()
    if error:
        return error

    # Parse Daraja inner payload structure parameters safely
    body = stk_callback_response.get('Body', {})
    stk_callback = body.get('stkCallback', {})

    result_code = stk_callback.get('ResultCode')
    result_desc = stk_callback.get('ResultDesc')
    merchant_request_id = stk_callback.get('MerchantRequestID')
    checkout_request_id = stk_callback.get('CheckoutRequestID')

    # Extract our unique acc tracking ref
    # saf sends  this inside the CallbackMetadata array if successfully processed
    metadata_items = stk_callback.get('CallbackMetadata', {}).get('Item', [])

    mpesa_receipt_number = None
    for item in metadata_items:
        if item.get('Name') == 'MpesaReceiptNumber':
            mpesa_receipt_number = item.get('Value')
            break

    # CheckoutRequestID is the only correlation key this callback is allowed to
    # use. It is issued by Daraja in response to our own STK push, so a genuine
    # callback always carries one.
    #
    # There used to be an AccountReference fallback here ("it is not guaranteed
    # in every callback"). AccountReference is a sequential integer we minted
    # ourselves, and the guard below it was written as
    # `if escrow and checkout_request_id and ...` — so omitting CheckoutRequestID
    # skipped the guard entirely. Anyone who could reach this public endpoint
    # could then mark any order in the system as paid with a receipt number of
    # their choosing. Correlation keys must never be guessable.
    if not checkout_request_id:
        logger.warning('M-Pesa callback arrived without a CheckoutRequestID; refusing to correlate')
        return jsonify({'ResultCode': 1, 'ResultDesc': 'Missing CheckoutRequestID'}), 400

    escrow = (
        EscrowTransaction.query.filter_by(checkout_request_id=str(checkout_request_id))
        .with_for_update()
        .first()
    )
    order = escrow.order if escrow else None

    if not order:
        logger.warning('M-Pesa callback has no matching checkout request', extra={
            'checkout_id': checkout_request_id,
        })
        return jsonify({'ResultCode': 1, 'ResultDesc': 'Payment transaction not found'}), 404

    # 2. EVALUATE TRANSACTION LIFECYCLE RESULTS
    if order.payment_status in {'paid', 'failed'} and (
        order.payment_status == 'paid' or result_code != 0
    ):
        logger.info(
            "Duplicate M-Pesa callback ignored for Order #%s. Receipt: %s",
            order.order_code, mpesa_receipt_number,
        )
        return (
            jsonify({"ResultCode": 0, "ResultDesc": "Callback already processed."}),
            200,
        )

    if result_code == 0:
        logger.info(
            "STK Push Payment Cleared for Order #%s. Receipt: %s",
            order.order_code, mpesa_receipt_number,
            extra={'order_id': order.id, 'checkout_id': checkout_request_id},
        )
        order.payment_status = 'paid'
        escrow = get_or_create_escrow(order)
        escrow.checkout_request_id = checkout_request_id
        fund_escrow(
            escrow,
            order.buyer,
            provider_transaction_id=checkout_request_id,
            mpesa_receipt_number=mpesa_receipt_number,
        )

        # Send SMS payment confirmation
        try:
            send_payment_confirmation_sms(order)
        except Exception as sms_error:
            logger.exception('Failed to send payment confirmation SMS', extra={'order_id': order.id})

        # Send WhatsApp payment confirmation
        try:
            send_payment_confirmation_whatsapp(order)
        except Exception as whatsapp_error:
            logger.exception('Failed to send payment confirmation WhatsApp', extra={'order_id': order.id})

    else:
        logger.warning("STK Push Payment Rejected for Order #%s. Reason: %s", order.order_code, result_desc)
        cancel_unpaid_order(order, escrow, failed=True)

    db.session.commit()

    # Safaricom requires this exact JSON response signature acknowledgement to clear the queue layout parameters
    return (
        jsonify({"ResultCode": 0, "ResultDesc": "Callback processed and acknowledged cleanly."}),
        200,
    )
