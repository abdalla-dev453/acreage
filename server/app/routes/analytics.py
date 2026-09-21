from flask import Blueprint, jsonify
from app import db
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.user import User
from app.utils.time import utcnow
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
from datetime import timedelta

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard_analytics():
    user_id = int(get_jwt_identity())
    user = db.get_or_404(User, user_id)

    # Filter base orders context dynamically depending on account classification
    if user.role == "farmer":
        orders_query = Order.query.filter_by(farmer_id=user_id)
    else:
        orders_query = Order.query.filter_by(buyer_id=user_id)

    total_orders = orders_query.count()
    delivered_count = orders_query.filter_by(status='delivered').count()
    on_delivery_count = orders_query.filter_by(status='on delivery').count()
    cancelled_count = orders_query.filter_by(status='cancelled').count()

    # Adapted total revenue calculations to support both buyer transactions and farmer earnings
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

        category_data = db.session.query(
            Product.category,
            func.sum(OrderItem.quantity * OrderItem.unit_price).label('revenue')
        ).join(OrderItem, Product.id == OrderItem.product_id)\
        .join(Order, Order.id == OrderItem.order_id)\
        .filter(Order.farmer_id == user_id)\
        .group_by(Product.category).all()

    else:
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

        category_data = db.session.query(
            Product.category,
            func.sum(OrderItem.quantity * OrderItem.unit_price).label('revenue')
        ).join(OrderItem, Product.id == OrderItem.product_id)\
        .join(Order, Order.id == OrderItem.order_id)\
        .filter(Order.buyer_id == user_id)\
        .group_by(Product.category).all()

    top_items = top_items_query.all()

    # Fetch total unique counters matching dashboard card views
    total_customers = db.session.query(func.count(func.distinct(Order.buyer_id))).filter(Order.farmer_id == user_id).scalar() if user.role == "farmer" else 1
    total_products = Product.query.filter_by(farmer_id=user_id).count() if user.role == "farmer" else Product.query.filter_by(is_available=True).count()

    # Compute month-over-month growth in delivered order count
    thirty_days_ago = utcnow() - timedelta(days=30)
    sixty_days_ago = utcnow() - timedelta(days=60)
    current_period_delivered = orders_query.filter(
        Order.status == 'delivered', Order.created_at >= thirty_days_ago
    ).count()
    previous_period_delivered = orders_query.filter(
        Order.status == 'delivered',
        Order.created_at >= sixty_days_ago,
        Order.created_at < thirty_days_ago
    ).count()
    if previous_period_delivered > 0:
        growth_pct = round(
            ((current_period_delivered - previous_period_delivered) / previous_period_delivered) * 100, 1
        )
    else:
        growth_pct = 100.0 if current_period_delivered > 0 else 0.0

    # Map category distribution array from actual data; return empty if zero records
    category_breakdown = [{
        "category": item.category if item.category else "Other Produce",
        "value": round(float(item.revenue), 2)
    } for item in category_data]

    total_revenue_val = float(total_revenue)
    top_category_revenue = float(category_data[0].revenue) if category_data else 0.0

    return jsonify({
        "metrics": {
            "total_orders": total_orders,
            "total_revenue": total_revenue,
            "total_customers": total_customers or 0,
            "total_menu": total_products or 0,
            "gross_revenue": total_revenue,
            "average_order_value": round((total_revenue / total_orders), 2) if total_orders else 0.0,
            "conversion_rate": f"{round((delivered_count / total_orders * 100), 1)}%" if total_orders else "0%",
            "sales_volume": total_orders
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
        "category_breakdown": category_breakdown,
        "overview": {
            "top_ordered_pct": round((top_category_revenue / total_revenue_val * 100), 1) if total_revenue_val > 0 else 0,
            "growth_rate": f"+{growth_pct}%" if growth_pct >= 0 else f"{growth_pct}%"
        }
    }), 200
