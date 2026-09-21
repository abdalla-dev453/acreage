from flask import Blueprint, jsonify, request
from app import db
from app.models.price_alert import PriceAlert
from app.models.product import Product
from app.models.user import User
from app.utils.price_alerts import alert_manager
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.orm import selectinload
import logging

price_alerts_bp = Blueprint('price_alerts', __name__)
logger = logging.getLogger(__name__)


@price_alerts_bp.route('/', methods=['GET'])
@jwt_required()
def get_user_alerts():
    """Get all price alerts for the current user"""
    user_id = int(get_jwt_identity())
    active_only = request.args.get('active', 'true').lower() == 'true'
    
    try:
        alerts = alert_manager.get_user_alerts(user_id, active_only)
        
        # Enrich alerts with product details
        enriched_alerts = []
        for alert in alerts:
            alert_dict = alert.to_dict()
            if alert.product:
                alert_dict['product'] = {
                    'id': alert.product.id,
                    'title': alert.product.title,
                    'price_per_unit': alert.product.price_per_unit,
                    'unit': alert.product.unit,
                    'is_available': alert.product.is_available
                }
            enriched_alerts.append(alert_dict)
        
        return jsonify({'items': enriched_alerts}), 200
        
    except Exception as e:
        logger.exception(f"Error getting alerts for user {user_id}")
        return jsonify({'message': 'Failed to retrieve alerts'}), 500


@price_alerts_bp.route('/', methods=['POST'])
@jwt_required()
def create_alert():
    """Create a new price alert"""
    user_id = int(get_jwt_identity())
    
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('product_id'):
            return jsonify({'message': 'product_id is required'}), 400
        if not data.get('alert_type'):
            return jsonify({'message': 'alert_type is required'}), 400
        
        # Validate product exists and belongs to user (if farmer)
        product = db.session.get(Product, data['product_id'])
        if not product:
            return jsonify({'message': 'Product not found'}), 404
        
        user = db.get_or_404(User, user_id)
        
        # Only farmers can create alerts for their own products
        if user.role == 'farmer' and product.farmer_id != user_id:
            return jsonify({'message': 'You can only create alerts for your own products'}), 403
        
        # Create the alert
        alert = alert_manager.create_alert(
            user_id=user_id,
            product_id=data['product_id'],
            alert_type=data['alert_type'],
            threshold_value=data.get('threshold_value'),
            threshold_percent=data.get('threshold_percent'),
            notification_method=data.get('notification_method', 'both')
        )
        
        return jsonify({'message': 'Alert created successfully', 'alert': alert.to_dict()}), 201
        
    except ValueError as e:
        return jsonify({'message': str(e)}), 400
    except Exception as e:
        logger.exception(f"Error creating alert for user {user_id}")
        return jsonify({'message': 'Failed to create alert'}), 500


@price_alerts_bp.route('/<int:alert_id>', methods=['DELETE'])
@jwt_required()
def delete_alert(alert_id):
    """Delete a specific price alert"""
    user_id = int(get_jwt_identity())
    
    try:
        success = alert_manager.delete_alert(alert_id, user_id)
        
        if success:
            return jsonify({'message': 'Alert deleted successfully'}), 200
        else:
            return jsonify({'message': 'Alert not found or unauthorized'}), 404
            
    except Exception as e:
        logger.exception(f"Error deleting alert {alert_id} for user {user_id}")
        return jsonify({'message': 'Failed to delete alert'}), 500


@price_alerts_bp.route('/<int:alert_id>/deactivate', methods=['PATCH'])
@jwt_required()
def deactivate_alert(alert_id):
    """Deactivate a specific price alert"""
    user_id = int(get_jwt_identity())
    
    try:
        success = alert_manager.deactivate_alert(alert_id, user_id)
        
        if success:
            return jsonify({'message': 'Alert deactivated successfully'}), 200
        else:
            return jsonify({'message': 'Alert not found or unauthorized'}), 404
            
    except Exception as e:
        logger.exception(f"Error deactivating alert {alert_id} for user {user_id}")
        return jsonify({'message': 'Failed to deactivate alert'}), 500


@price_alerts_bp.route('/check', methods=['POST'])
@jwt_required()
def check_alerts():
    """Manually trigger alert checking (admin use or scheduled task)"""
    user_id = int(get_jwt_identity())
    user = db.get_or_404(User, user_id)
    
    # Only allow farmers or admins to check alerts
    if user.role not in ['farmer', 'admin']:
        return jsonify({'message': 'Unauthorized'}), 403
    
    try:
        triggered_count = alert_manager.check_and_trigger_alerts()
        return jsonify({
            'message': f'Checked alerts, triggered {triggered_count}',
            'triggered_count': triggered_count
        }), 200
        
    except Exception as e:
        logger.exception("Error checking alerts")
        return jsonify({'message': 'Failed to check alerts'}), 500


@price_alerts_bp.route('/types', methods=['GET'])
def get_alert_types():
    """Get available alert types with descriptions"""
    return jsonify({
        'alert_types': alert_manager.alert_types
    }), 200