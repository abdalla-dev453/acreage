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
            "CallBackURL": "https://yourdomain.com", # Public ngrok/production target hook URL
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
