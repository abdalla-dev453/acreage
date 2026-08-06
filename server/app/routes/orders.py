from flask import Blueprint, jsonify, request
from app import db
from app.models.order import Order
from app.models.product import Product
from app.schemas.order import order_schema, orders_schema
from flask_jwt_extended import jwt_required, get_jwt_identity
import uuid

orders_bp = Blueprint('orders', __name__)

@orders_bp.route('/', methods=['GET'])
@jwt_required
def get_orders():
    user_id = int(get_jwt_identity())
    role = request.args.get('role', 'farmer')

    if role == 'farmer':
        orders = Order.query.filter_by(farmer_id=user_id).order_by(Order.created_at.desc()).all()
    else:
        orders = Order.query.filter_by(buyer_id=user_id).order_by(Order.created_at.desc()).all()

    return orders_schema.jsonify(orders), 200


@orders_bp.route('/', methods=['POST'])
@jwt_required
def place_order():
    buyer_id = int(get_jwt_identity())
    data = request.get_json() or {}

    items_data = data.get('items', [])
    if not items_data:
        return jsonify({'message': 'Order must contain at least one item'}), 400

    first_product = Product.query.get_or_404(items_data[0]['product_id'])
    farmer_id = first_product.farmer_id

    total_amount = 0.0
    order_items = []

    for item in items_data:
        product = Product.query.get_or_404(item['product_id'])
        qty = float(item['quantity'])
        if product.stock_quantity < qty:
            return jsonify({'message': f'Insufficient stock for product {product.title}'}), 400

        product.stock_quantity -= qty
        subtotal = product.price_per_unit * qty
        total_amount += subtotal

        order_items.append(OrderItem(
            product_id=product.id,
            quantity=qty,
            unit_price=product.price_per_unit
        ))


        order_items = Order(
            order_code=f"#{uuid.uuid4().hex[:6].upper()}",
            buyer_id=buyer_id,
            farmer_id=farmer_id,
            total_amount=total_amount,
            payment_status=data.get('payment_status', 'Cash on Delivery'),
            delivery_address=data.get('delivery_address', ''),
            contact_phone=data.get('contact_phone', ''),
            items=order_items
        )

        db.session.add(order_items)
        db.session.commit()
        return order_schema.jsonify(order_items), 201


@orders_bp.route('/<int:order_id>/status', methods=['PATCH'])
@jwt_required
def update_order_status(order_id):
    order = Order.query.get_or_404(order_id)
    data = request.get_json() or {}
    new_status = data.get('status')

    valid_statuses = ['Pending', 'On Delivery', 'Delivered', 'Cancelled']
    if new_status not in valid_statuses:
        return jsonify({'message': 'Invalid order status'}), 400

    order.status = new_status
    db.session.commit()
    return order_schema.jsonify(order), 200