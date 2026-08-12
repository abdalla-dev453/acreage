from flask import Blueprint, jsonify, request
from app import db
from app.models.order import Order, OrderItem 
from app.models.product import Product
from app.models.user import User  
from app.schemas.order import order_schema, orders_schema
from flask_jwt_extended import jwt_required, get_jwt_identity
import uuid
import os
import datetime
import base64
import requests
import logging
from app.utils.mpesa import get_mpesa_access_token
from app.utils.http import json_object

orders_bp = Blueprint('orders', __name__)
logger = logging.getLogger(__name__)


@orders_bp.route('/', methods=['GET'])
@jwt_required()
def get_orders():
    user_id = int(get_jwt_identity())
    role = request.args.get('role', 'farmer')

    if role == 'farmer':
        orders = Order.query.filter_by(farmer_id=user_id).order_by(Order.created_at.desc()).all()
    else:
        orders = Order.query.filter_by(buyer_id=user_id).order_by(Order.created_at.desc()).all()

    return orders_schema.jsonify(orders), 200


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

    if not all(isinstance(item, dict) and item.get('product_id') is not None for item in items_data):
        return jsonify({'message': 'Each order item requires a product_id and quantity'}), 400
    first_product = db.get_or_404(Product, items_data[0]['product_id'])
    farmer_id = first_product.farmer_id
    if farmer_id == buyer_id:
        return jsonify({'message': 'You cannot place an order for your own product'}), 400

    total_amount = 0.0
    compiled_items = [] 

    # Process inventory items to calculate total amounts and reduce stock weight parameters
    for item in items_data:
        product = db.get_or_404(Product, item['product_id'])
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

        compiled_items.append(OrderItem(
            product_id=product.id,
            quantity=qty,
            unit_price=product.price_per_unit
        ))

    # Clean phone numbers to strict 2547XXXXXXXX or 2541XXXXXXXX formats required by Safaricom
    raw_phone = str(data.get('contact_phone', '')).strip().replace('+', '').replace(' ', '')
    if raw_phone.startswith('0'):
        cleaned_phone = '254' + raw_phone[1:]
    elif raw_phone.startswith('7') or raw_phone.startswith('1'):
        cleaned_phone = '254' + raw_phone
    else:
        cleaned_phone = raw_phone

    new_order = Order(
        order_code=f"ACR-{uuid.uuid4().hex[:6].upper()}", 
        buyer_id=buyer_id,
        farmer_id=farmer_id,
        total_amount=total_amount,
        status="pending",
        payment_status=data.get('payment_status', 'unpaid'),
        delivery_address=data.get('delivery_address', 'Fulfillment Warehouse, Nairobi'),
        contact_phone=cleaned_phone,
        items=compiled_items
    )

    try:
        db.session.add(new_order)
        # Generate the identifier before handing the payment request to M-Pesa.
        db.session.flush()

        token = get_mpesa_access_token()
        if token:
            env = os.getenv('MPESA_ENV', 'sandbox')
            base_url = "https://sandbox.safaricom.co.ke" if env == "sandbox" else "https://api.safaricom.co.ke"
            timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
            password = base64.b64encode(f"{os.getenv('MPESA_SHORTCODE', '174379')}{os.getenv('MPESA_PASSKEY', '')}{timestamp}".encode()).decode('utf-8')
            stk_payload = {
                "BusinessShortCode": os.getenv('MPESA_SHORTCODE', '174379'),
                "Password": password,
                "Timestamp": timestamp,
                "TransactionType": "CustomerPayBillOnline",
                "Amount": int(new_order.total_amount),
                "PartyA": cleaned_phone,
                "PartyB": os.getenv('MPESA_SHORTCODE', '174379'),
                "PhoneNumber": cleaned_phone,
                "CallBackURL": os.getenv('MPESA_CALLBACK_URL', 'http://localhost:5000/api/orders/mpesa-callback'),
                "AccountReference": f"ACR{new_order.id}",
                "TransactionDesc": "Acreage Marketplace Escrow Purchase"
            }
    
            headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
            try:
                requests.post(f"{base_url}/mpesa/stkpush/v1/processrequest", json=stk_payload, headers=headers, timeout=15)
            except requests.RequestException:
                logger.exception('M-Pesa STK request failed', extra={'order_id': new_order.id})

        db.session.commit()
    except Exception:
        db.session.rollback()
        logger.exception('Order creation failed', extra={'buyer_id': buyer_id})
        return jsonify({'message': 'Unable to place order. Please try again.'}), 500
    
    return order_schema.jsonify(new_order), 201


@orders_bp.route('/<int:order_id>/status', methods=['PATCH'])
@jwt_required()
def update_order_status(order_id):
    order = db.get_or_404(Order, order_id)
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
        for item in order.items:
            item.product.stock_quantity += item.quantity
        logger.info('Order cancelled and stock restored', extra={'order_id': order.id})
    order.status = new_status
    db.session.commit()
    
    return order_schema.jsonify(order), 200



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


    # Extract the custom structural tracking target from the acc ref string layout 
    # IN place_order we formatted AccountReference as f"ACR{new_order.id}"
    # Lets extract the numeric ID
    account_ref = stk_callback.get('AccountReference', '')
    order_id_str = account_ref.replace('ACR', '').strip()

    # Alternative fallback fallback check
    order = None
    if order_id_str.isdigit():
        order = db.session.get(Order, int(order_id_str))


    if not order:
        # High-utility recovery mode query if string slicing misses matching index targets
        print(f"Callback mapping error. Order reference {account_ref} not found locally.")
        return jsonify({"ResultCode": 1, "ResultDesc": "Order identifier missing alignment"}), 400

    # 2. EVALUATE TRANSACTION LIFECYCLE RESULTS
    if result_code == 0:
        # Success code (0 means the customer entered the correct pin and funds transferred)
        print(f"STK Push Payment Cleared for Order #{order.order_code}. Receipt: {mpesa_receipt_number}")
        order.payment_status = 'paid'
        # Optional: You can attach the receipt number onto your order tracking text string notes if needed
        order.delivery_address += f" [M-Pesa Ref: {mpesa_receipt_number}]"
        
    else:
        # Failure code (Customer cancelled, insufficient funds, timeout, etc.)
        print(f"STK Push Payment Rejected for Order #{order.order_code}. Reason: {result_desc}")
        order.payment_status = 'failed'
        order.status = 'cancelled'
        
        # RESTORE PRODUCT STOCK: Since payment failed, release crop items back to the marketplace immediately
        for item in order.items:
            product = db.session.get(Product, item.product_id)
            if product:
                product.stock_quantity += item.quantity

    db.session.commit()
    
    # Safaricom requires this exact JSON response signature acknowledgement to clear the queue layout parameters
    return jsonify({"ResultCode": 0, "ResultDesc": "Callback processed and acknowledged cleanly."}), 200
