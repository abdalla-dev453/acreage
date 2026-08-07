from flask import Blueprint, jsonify
from app import db
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.user import User
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func

analytics_bp = Blueprint('analytics', __name__)


@analytics_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard_analytics():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)


    # Filter base orders context dynamically depending on account classification
    if user.role == "farmer":
        orders_query = Order.query.filter_by(farmer_id=user_id)
    else:
        orders_query = Order.query.filter_by(buyer_id=user_id)


    # 1.Shifted lookups to lowercase to match model schema database entries
    total_orders = orders_query.count()
    delivered_count = orders_query.filter_by(status='delivered').count()
    on_delivery_count = orders_query.filter_by(status='on delivery').count()
    cancelled_count = orders_query.filter_by(status='cancelled').count()


    # 2.Adapted total revenue calculations to support both buyer transactions and farmer earnings
    if user.role == "farmer":
        total_revenue = db.session.query(func.sum(Order.total_amount))\
            .filter(Order.farmer_id == user_id, Order.status == 'delivered').scalar() or 0.0
            
        top_items_query = db.session.query(
            Product.title,
            func.sum(OrderItem.quantity).label('total_qty')
        ).join(OrderItem, Product.id == OrderItem.product_id)\
        .join(Order, Order.id == OrderItem.order_id)\
        .filter(Order.farmer_id == user_id)\
        .group_by(Product.title)\
        .order_by(func.sum(OrderItem.quantity).desc())\
        .limit(5)
    else:
        # Buyers track their aggregate purchase spends across the market layout
        total_revenue = db.session.query(func.sum(Order.total_amount))\
            .filter(Order.buyer_id == user_id, Order.status == 'delivered').scalar() or 0.0
            
        top_items_query = db.session.query(
            Product.title,
            func.sum(OrderItem.quantity).label('total_qty')
        ).join(OrderItem, Product.id == OrderItem.product_id)\
        .join(Order, Order.id == OrderItem.order_id)\
        .filter(Order.buyer_id == user_id)\
        .group_by(Product.title)\
        .order_by(func.sum(OrderItem.quantity).desc())\
        .limit(5)

    top_items = top_items_query.all()

    # Fetch total unique counters matching dashboard card views
    total_customers = db.session.query(func.count(func.distinct(Order.buyer_id))).filter(Order.farmer_id == user_id).scalar() if user.role == "farmer" else 1
    total_products = Product.query.filter_by(farmer_id=user_id).count() if user.role == "farmer" else Product.query.filter_by(is_available=True).count()
    total_workers = User.query.filter_by(role='farmer').count()

    return jsonify({
        "metrics": {
            "total_orders": total_orders,
            "total_revenue": total_revenue,
            "total_customers": total_customers or 0,
            "total_menu": total_products or 0,
            "total_workers": total_workers or 0,
            "growth_rate": "+14%" 
        },
        "order_summary": {
            "on_delivery_pct": round((on_delivery_count / total_orders * 100), 1) if total_orders else 0,
            "delivered_pct": round((delivered_count / total_orders * 100), 1) if total_orders else 0,
            "cancelled_pct": round((cancelled_count / total_orders * 100), 1) if total_orders else 0,
        },
        "top_selling_items": [{ 
            "title": item.title,
            "quantity": item.total_qty
        } for item in top_items],
        "top_ordered_pct": 52
    }), 200
