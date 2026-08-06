from flask import Blueprint, jsonify
from app import db
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.user import User
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/dashboard', methods=['GET'])
@jwt_required
def get_dashboard_analytics():
    user_id = int(get_jwt_identity())
    user= User.query.get_or_404(user_id)

    if user.role == "farmer":
        orders_query = Order.query.filter_by(farmer_id=user_id)
    else:
        orders_query = Order.query.filter_by(buyer_id=user_id)


    total_orders = orders_query.count()
    delivered_count = orders_query.filter_by(status='Delivered').count()
    on_delivery_count = orders_query.filter_by(status='On Delivery').count()
    cancelled_count = orders_query.filter_by(status='Cancelled').count()


    total_revenue = db.session.query(func.sum(Order.total_amount))\
        .filter(Order.farmer_id == user_id, Order.status == 'Delivered').scalar() or 0.0


    top_items = db.session.query(
        Product.title,
        func.sum(OrderItem.quantity).label('total_qty')
    ).join(OrderItem, Product.id == OrderItem.product_id)\
    .join(Order, Order.id == OrderItem.order_id)\
    .filter(Order.farmer_id == user_id)\
    .group_by(Product.title)\
    .order_by(func.sum(OrderItem.quantity).desc())\
    .limit(5).all()


    return jsonify({
        "metrics": {
            "total_orders": total_orders,
            "total_revenue": total_revenue,
            "delivered_orders": delivered_count,
            "on_delivery_orders": on_delivery_count,
            "cancelled_orders": cancelled_count
        },
        "order_summary": {
            "on_delivery_pct": round((on_delivery_count / total_orders * 100), 1) if total_orders else 0,
            "delivery_pct": round((delivered_count / total_orders * 100), 1) if total_orders else 0,
            "cancelled_pct": round((cancelled_count / total_orders * 100), 1) if total_orders else 0,
        },
        "top_selling_iems": [{
            "title": item.title,
            "quantity": item.total_qty
        } for item in top_items]
    }), 200
