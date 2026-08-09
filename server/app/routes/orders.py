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
from app.utils.mpesa import get_mpesa_access_token

orders_bp = Blueprint('orders', __name__)


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
    
    buyer_user = User.query.get_or_404(buyer_id)
    
    data = request.get_json() or {}
    items_data = data.get('items', [])
    if not items_data:
        return jsonify({'message': 'Order must contain at least one item'}), 400

    first_product = Product.query.get_or_404(items_data[0]['product_id'])
    farmer_id = first_product.farmer_id

    total_amount = 0.0
    compiled_items = [] 

    # Process inventory items to calculate total amounts and reduce stock weight parameters
    for item in items_data:
        product = Product.query.get_or_404(item['product_id'])
        qty = float(item['quantity'])
        
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
    raw_phone = str(data.get('contact_phone', buyer_user.phone_number or '')).strip().replace('+', '').replace(' ', '')
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

    db.session.add(new_order)
    
    #ENHANCEMENT: Pre-commit order so it generates an incremental ID for AccountReference tracking
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
            "Amount": int(new_order.total_amount), # Shilling integers decimal drops
            "PartyA": cleaned_phone,               #  FIXED: Points to verified clean user phone sequence
            "PartyB": os.getenv('MPESA_SHORTCODE', '174379'),
            "PhoneNumber": cleaned_phone,           #  FIXED: Points to verified clean user phone sequence
            "CallBackURL": "https://ngrok-free.app", # Public ngrok/production target hook URL
            "AccountReference": f"ACR{new_order.id}",
            "TransactionDesc": "Acreage Marketplace Escrow Purchase"
        }
    
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        try:
            requests.post(f"{base_url}/mpesa/stkpush/v1/processrequest", json=stk_payload, headers=headers, timeout=15)
        except Exception as api_err:
            print(f"STK Push network connection timeout: {str(api_err)}")

    # FIXED: Moved outside the if condition block so that orders save even if the token fails
    db.session.commit()
    
    return order_schema.jsonify(new_order), 201


@orders_bp.route('/<int:order_id>/status', methods=['PATCH'])
@jwt_required()
def update_order_status(order_id):
    order = Order.query.get_or_404(order_id)
    data = request.get_json() or {}
    new_status = data.get('status')

    valid_statuses = ['pending', 'on delivery', 'delivered', 'cancelled']
    if not new_status or new_status.lower() not in valid_statuses:
        return jsonify({'message': 'Invalid order status parameter'}), 400

    order.status = new_status.lower()
    db.session.commit()
    
    return order_schema.jsonify(order), 200



# MPESA CALLBACKS ENDPOINT
@orders_bp.route('/mpesa-callback', methods=['POST'])
def mpesa_callback():
    """.
    Asynchronous WEbhook listening for safaricom Daraja STK push processing results.
    This route is public  (no@jwt_required) becoz it is called external by safaricom.
    """

    stk_callback_response = request.get_json() or {}

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
        if item.get('None') == 'MpesaReceiptNumber':
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
        order = Order.query.get(int(order_id_str))


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
            product = Product.query.get(item.product_id)
            if product:
                product.stock_quantity += item.quantity

    db.session.commit()
    
    # Safaricom requires this exact JSON response signature acknowledgement to clear the queue layout parameters
    return jsonify({"ResultCode": 0, "ResultDesc": "Callback processed and acknowledged cleanly."}), 200