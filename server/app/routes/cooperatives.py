from flask import Blueprint, jsonify, request
from app import db
from app.models.cooperative import Cooperative, BulkOrder, BulkOrderItem
from app.models.user import User
from app.models.product import Product
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging
import uuid

cooperatives_bp = Blueprint('cooperatives', __name__)
logger = logging.getLogger(__name__)


@cooperatives_bp.route('', methods=['GET'])
@cooperatives_bp.route('/', methods=['GET'])
@jwt_required()
def get_cooperatives():
    """Get all cooperatives"""
    try:
        cooperatives = Cooperative.query.filter_by(is_active=True).all()

        # Enrich with member counts
        enriched_coops = []
        for coop in cooperatives:
            coop_dict = coop.to_dict()
            # Count farmers in this cooperative
            member_count = User.query.filter_by(cooperative_id=coop.id, role='farmer').count()
            coop_dict['member_count'] = member_count
            enriched_coops.append(coop_dict)

        return jsonify({
            'items': enriched_coops
        }), 200
    except Exception as e:
        logger.exception("Error getting cooperatives")
        return jsonify({'message': 'Failed to retrieve cooperatives'}), 500


@cooperatives_bp.route('', methods=['POST'])
@cooperatives_bp.route('/', methods=['POST'])
@jwt_required()
def create_cooperative():
    """Create a new cooperative (admin function)"""
    user_id = int(get_jwt_identity())
    user = db.get_or_404(User, user_id)
    
    if user.role != 'admin':
        return jsonify({'message': 'Only admins can create cooperatives'}), 403
    
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('name'):
            return jsonify({'message': 'Cooperative name is required'}), 400
        if not data.get('registration_number'):
            return jsonify({'message': 'Registration number is required'}), 400
        
        # Check if cooperative already exists
        existing = Cooperative.query.filter_by(name=data['name']).first()
        if existing:
            return jsonify({'message': 'Cooperative with this name already exists'}), 400
        
        # Create cooperative
        cooperative = Cooperative(
            name=data['name'],
            description=data.get('description'),
            location=data.get('location'),
            county=data.get('county'),
            registration_number=data['registration_number'],
            contact_person=data.get('contact_person'),
            contact_phone=data.get('contact_phone'),
            contact_email=data.get('contact_email'),
            established_date=data.get('established_date')
        )
        
        db.session.add(cooperative)
        db.session.commit()
        
        logger.info(f"Created cooperative {cooperative.id} by user {user_id}")
        return jsonify({'message': 'Cooperative created successfully', 'cooperative': cooperative.to_dict()}), 201
        
    except Exception as e:
        logger.exception(f"Error creating cooperative by user {user_id}")
        db.session.rollback()
        return jsonify({'message': 'Failed to create cooperative'}), 500


@cooperatives_bp.route('/<int:cooperative_id>/join', methods=['POST'])
@jwt_required()
def join_cooperative(cooperative_id):
    """Join a cooperative as a farmer"""
    user_id = int(get_jwt_identity())
    user = db.get_or_404(User, user_id)
    
    if user.role != 'farmer':
        return jsonify({'message': 'Only farmers can join cooperatives'}), 403
    
    try:
        cooperative = db.get_or_404(Cooperative, cooperative_id)
        
        if user.cooperative_id:
            return jsonify({'message': 'You are already a member of a cooperative'}), 400
        
        user.cooperative_id = cooperative_id
        db.session.commit()
        
        logger.info(f"User {user_id} joined cooperative {cooperative_id}")
        return jsonify({'message': 'Successfully joined cooperative'}), 200
        
    except Exception as e:
        logger.exception(f"Error joining cooperative {cooperative_id} for user {user_id}")
        db.session.rollback()
        return jsonify({'message': 'Failed to join cooperative'}), 500


@cooperatives_bp.route('/<int:cooperative_id>/bulk-orders', methods=['POST'])
@jwt_required()
def create_bulk_order(cooperative_id):
    """Create a bulk order for a cooperative"""
    user_id = int(get_jwt_identity())
    user = db.get_or_404(User, user_id)
    
    if user.role != 'buyer':
        return jsonify({'message': 'Only buyers can place bulk orders'}), 403
    
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('items') or not isinstance(data['items'], list):
            return jsonify({'message': 'items array is required'}), 400
        
        cooperative = db.get_or_404(Cooperative, cooperative_id)
        
        # Validate items and calculate total
        total_amount = 0.0
        order_items = []
        
        for item_data in data['items']:
            product = db.get_or_404(Product, item_data['product_id'])
            farmer = db.get_or_404(User, item_data['farmer_id'])
            
            # Verify farmer is in the cooperative
            if farmer.cooperative_id != cooperative.id:
                return jsonify({'message': f'Farmer {farmer.username} is not a member of this cooperative'}), 400
            
            if not product.is_available:
                return jsonify({'message': f'Product {product.title} is not available'}), 400
            
            quantity = float(item_data['quantity'])
            if quantity <= 0:
                return jsonify({'message': 'Quantity must be greater than 0'}), 400
            
            if product.stock_quantity < quantity:
                return jsonify({'message': f'Insufficient stock for {product.title}'}), 400
            
            # Calculate item total
            item_total = product.price_per_unit * quantity
            total_amount += item_total
            
            # Create order item
            order_item = BulkOrderItem(
                farmer_id=farmer.id,
                product_id=product.id,
                quantity=quantity,
                unit_price=product.price_per_unit,
                unit=product.unit
            )
            order_items.append(order_item)
        
        # Create bulk order
        bulk_order = BulkOrder(
            cooperative_id=cooperative.id,
            order_code=f"BULK-{uuid.uuid4().hex[:8].upper()}",
            buyer_id=user_id,
            total_amount=total_amount,
            delivery_address=data.get('delivery_address'),
            contact_phone=data.get('contact_phone'),
            special_instructions=data.get('special_instructions'),
            target_delivery_date=data.get('target_delivery_date'),
            items=order_items
        )
        
        db.session.add(bulk_order)
        db.session.commit()
        
        logger.info(f"Created bulk order {bulk_order.id} for cooperative {cooperative.id}")
        return jsonify({'message': 'Bulk order created successfully', 'order': bulk_order.to_dict()}), 201
        
    except Exception as e:
        logger.exception(f"Error creating bulk order for user {user_id}")
        db.session.rollback()
        return jsonify({'message': 'Failed to create bulk order'}), 500


@cooperatives_bp.route('/bulk-orders', methods=['GET'])
@jwt_required()
def get_bulk_orders():
    """Get bulk orders for the current user"""
    user_id = int(get_jwt_identity())
    user = db.get_or_404(User, user_id)
    
    try:
        if user.role == 'buyer':
            orders = BulkOrder.query.filter_by(buyer_id=user_id).all()
        elif user.role == 'farmer':
            # Get orders that include items from this farmer
            orders = BulkOrder.query.join(BulkOrderItem).filter(
                BulkOrderItem.farmer_id == user_id
            ).all()
        else:
            orders = []
        
        enriched_orders = []
        for order in orders:
            order_dict = order.to_dict()
            order_dict['cooperative'] = order.cooperative.to_dict() if order.cooperative else None
            enriched_orders.append(order_dict)
        
        return jsonify({'items': enriched_orders}), 200
        
    except Exception as e:
        logger.exception(f"Error getting bulk orders for user {user_id}")
        return jsonify({'message': 'Failed to retrieve bulk orders'}), 500


@cooperatives_bp.route('/bulk-orders/<int:order_id>/items/<int:item_id>/confirm', methods=['PATCH'])
@jwt_required()
def confirm_bulk_order_item(order_id, item_id):
    """Farmer confirms a bulk order item"""
    user_id = int(get_jwt_identity())
    user = db.get_or_404(User, user_id)
    
    if user.role != 'farmer':
        return jsonify({'message': 'Only farmers can confirm order items'}), 403
    
    try:
        item = db.session.get(BulkOrderItem, item_id)
        if not item or item.farmer_id != user_id:
            return jsonify({'message': 'Order item not found or unauthorized'}), 404
        
        order = db.session.get(BulkOrder, order_id)
        if not order:
            return jsonify({'message': 'Order not found'}), 404
        
        # Check if order is in appropriate status
        if order.status not in ['pending', 'confirmed']:
            return jsonify({'message': 'Order cannot be modified in current status'}), 400
        
        # Update item status
        item.status = 'confirmed'
        db.session.commit()
        
        # Check if all items are confirmed
        all_confirmed = all(i.status == 'confirmed' for i in order.items)
        if all_confirmed:
            order.status = 'confirmed'
            db.session.commit()
        
        logger.info(f"Farmer {user_id} confirmed bulk order item {item_id}")
        return jsonify({'message': 'Order item confirmed successfully'}), 200
        
    except Exception as e:
        logger.exception(f"Error confirming bulk order item {item_id} for user {user_id}")
        db.session.rollback()
        return jsonify({'message': 'Failed to confirm order item'}), 500