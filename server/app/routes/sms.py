from flask import Blueprint, request, jsonify, current_app
from app import db
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.user import User
from app.models.sms_log import SMSLog
from app.utils.sms import send_sms_notification, send_order_status_sms, send_payment_confirmation_sms
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import logging
import re

sms_bp = Blueprint('sms', __name__)
limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger(__name__)


@sms_bp.route('/webhook', methods=['POST'])
def sms_webhook():
    """
    Receive incoming SMS from SMS provider webhook.
    Expected format: {"from": "+254712345678", "message": "ORDER 123 5", "provider": "africas_talking"}
    """
    # Verify webhook token for security (skip in development if token not set)
    webhook_token = request.headers.get('X-Webhook-Token')
    config_token = current_app.config.get('SMS_WEBHOOK_TOKEN')
    if config_token and webhook_token != config_token:
        logger.warning("Unauthorized SMS webhook attempt")
        return jsonify({'message': 'Unauthorized'}), 401
    
    data = request.get_json()
    if not data:
        return jsonify({'message': 'Invalid request'}), 400
    
    phone_number = data.get('from') or data.get('phone') or data.get('phoneNumber')
    message = data.get('message') or data.get('text') or data.get('content')
    provider = data.get('provider', 'unknown')
    
    if not phone_number or not message:
        return jsonify({'message': 'Missing phone number or message'}), 400
    
    # Log the incoming SMS
    sms_log = SMSLog(
        phone_number=phone_number,
        message=message,
        direction='inbound',
        status='received',
        provider=provider
    )
    db.session.add(sms_log)
    
    try:
        # Process the SMS command
        response_message = process_sms_command(phone_number, message)
        
        # Send response SMS
        success, _ = send_sms_notification(phone_number, response_message)
        
        sms_log.status = 'processed' if success else 'failed'
        db.session.commit()
        
        return jsonify({'message': 'SMS processed successfully', 'response': response_message}), 200
        
    except Exception as e:
        logger.exception(f"Error processing SMS from {phone_number}")
        sms_log.status = 'failed'
        sms_log.error_message = str(e)
        db.session.commit()
        
        # Send error response
        error_message = "Sorry, we couldn't process your request. Please try again or contact support."
        send_sms_notification(phone_number, error_message)
        
        return jsonify({'message': 'Processing failed'}), 500


def process_sms_command(phone_number, message):
    """
    Process SMS commands from users.
    Supported commands:
    - ORDER <product_id> <quantity> - Place an order
    - STATUS <order_code> - Check order status
    - HELP - Show help information
    - PRODUCTS - List available products (simplified)
    """
    message = message.strip().upper()
    
    # Find user by phone number
    user = User.query.filter(User.phone_number == phone_number).first()
    
    if not user:
        return "Welcome to Acreage! To get started, please register on our website or app first."
    
    if user.role != 'buyer':
        return "SMS ordering is currently available for buyers only."
    
    # Parse command
    if message.startswith('ORDER'):
        return handle_order_command(user, message)
    elif message.startswith('STATUS'):
        return handle_status_command(user, message)
    elif message == 'HELP':
        return get_help_message()
    elif message == 'PRODUCTS':
        return handle_products_command()
    else:
        return "Invalid command. Text HELP for available commands."


def handle_order_command(user, message):
    """Handle ORDER command: ORDER <product_id> <quantity>"""
    try:
        # Parse: ORDER 123 5
        parts = message.split()
        if len(parts) < 3:
            return "Invalid format. Use: ORDER <product_id> <quantity>. Example: ORDER 123 5"
        
        product_id = int(parts[1])
        quantity = float(parts[2])
        
        if quantity <= 0:
            return "Quantity must be greater than 0."
        
        # Get product
        product = db.session.get(Product, product_id)
        if not product:
            return f"Product with ID {product_id} not found."
        
        if not product.is_available:
            return f"Product {product.title} is currently unavailable."
        
        if product.stock_quantity < quantity:
            return f"Insufficient stock. Only {product.stock_quantity} {product.unit} available."
        
        # Create order
        total_amount = product.price_per_unit * quantity
        product.stock_quantity -= quantity
        
        order = Order(
            order_code=f"ACR-{generate_order_code()}",
            buyer_id=user.id,
            farmer_id=product.farmer_id,
            total_amount=total_amount,
            status="pending",
            payment_status="unpaid",
            delivery_address=user.location or 'Fulfillment Warehouse, Nairobi',
            contact_phone=user.phone_number,
            items=[OrderItem(
                product_id=product.id,
                quantity=quantity,
                unit_price=product.price_per_unit
            )]
        )
        
        db.session.add(order)
        db.session.commit()
        
        # Log the SMS-triggered order
        sms_log = SMSLog(
            phone_number=user.phone_number,
            message=f"Order created via SMS: {order.order_code}",
            direction='outbound',
            status='sent',
            provider='system',
            related_order_id=order.id,
            related_user_id=user.id
        )
        db.session.add(sms_log)
        db.session.commit()
        
        return f"Order {order.order_code} placed successfully! Total: KES {total_amount}. Please pay via M-Pesa to complete your order."
        
    except ValueError:
        return "Invalid format. Use: ORDER <product_id> <quantity>. Example: ORDER 123 5"
    except Exception as e:
        logger.exception(f"Error in SMS order command")
        return "Sorry, we couldn't place your order. Please try again."


def handle_status_command(user, message):
    """Handle STATUS command: STATUS <order_code>"""
    try:
        parts = message.split()
        if len(parts) < 2:
            return "Invalid format. Use: STATUS <order_code>. Example: STATUS ACR-ABC123"
        
        order_code = parts[1]
        
        order = Order.query.filter_by(order_code=order_code, buyer_id=user.id).first()
        if not order:
            return f"Order {order_code} not found."
        
        status_text = f"Order {order.order_code}\n"
        status_text += f"Status: {order.status.upper()}\n"
        status_text += f"Payment: {order.payment_status.upper()}\n"
        status_text += f"Total: KES {order.total_amount}\n"
        
        if order.items:
            for item in order.items:
                status_text += f"- {item.product.title} x {item.quantity} {item.product.unit}\n"
        
        return status_text.strip()
        
    except Exception as e:
        logger.exception(f"Error in SMS status command")
        return "Sorry, we couldn't retrieve your order status. Please try again."


def handle_products_command():
    """Handle PRODUCTS command - return simplified product list"""
    try:
        products = Product.query.filter_by(is_available=True).limit(5).all()
        
        if not products:
            return "No products currently available."
        
        message = "Available products (top 5):\n"
        for product in products:
            message += f"{product.id}. {product.title} - KES {product.price_per_unit}/{product.unit}\n"
        
        message += "\nTo order: ORDER <product_id> <quantity>"
        return message.strip()
        
    except Exception as e:
        logger.exception(f"Error in SMS products command")
        return "Sorry, we couldn't retrieve product information. Please try again."


def get_help_message():
    """Return help message with available commands"""
    return (
        "Acreage SMS Commands:\n"
        "ORDER <id> <qty> - Place order (e.g., ORDER 123 5)\n"
        "STATUS <code> - Check order status (e.g., STATUS ACR-ABC123)\n"
        "PRODUCTS - List available products\n"
        "HELP - Show this message"
    )


def generate_order_code():
    """Generate a random 6-character order code"""
    import random
    import string
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


@sms_bp.route('/send-test', methods=['POST'])
def send_test_sms():
    """
    Development endpoint to test SMS sending.
    Only available in development mode.
    """
    if current_app.config.get('IS_PROD'):
        return jsonify({'message': 'Not available in production'}), 403
    
    data = request.get_json()
    phone_number = data.get('phone_number')
    message = data.get('message')
    
    if not phone_number or not message:
        return jsonify({'message': 'phone_number and message required'}), 400
    
    success, sms_log = send_sms_notification(phone_number, message)
    
    if success:
        return jsonify({
            'message': 'Test SMS sent successfully',
            'sms_log': sms_log.to_dict() if sms_log else None
        }), 200
    else:
        return jsonify({
            'message': 'Failed to send test SMS',
            'sms_log': sms_log.to_dict() if sms_log else None
        }), 500


@sms_bp.route('/logs', methods=['GET'])
def get_sms_logs():
    """Get SMS logs (admin only - simplified for now)"""
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    
    logs = SMSLog.query.order_by(SMSLog.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'items': [log.to_dict() for log in logs.items],
        'total': logs.total,
        'page': page,
        'pages': logs.pages,
        'has_next': logs.has_next,
        'has_prev': logs.has_prev
    }), 200