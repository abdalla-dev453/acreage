from flask import Blueprint, request, jsonify, current_app
from app import db
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.user import User
from app.models.whatsapp_log import WhatsAppLog
from app.utils.whatsapp import (
    get_whatsapp_provider, 
    send_whatsapp_notification, 
    send_order_status_whatsapp, 
    send_payment_confirmation_whatsapp
)
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import logging

whatsapp_bp = Blueprint('whatsapp', __name__)
limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger(__name__)


@whatsapp_bp.route('/webhook', methods=['GET'])
def verify_webhook():
    """
    Verify WhatsApp webhook setup.
    Called by WhatsApp during webhook configuration.
    """
    mode = request.args.get('hub.mode')
    token = request.args.get('hub.verify_token')
    challenge = request.args.get('hub.challenge')
    
    provider = get_whatsapp_provider()
    result = provider.verify_webhook(mode, token, challenge)
    
    if result:
        logger.info("WhatsApp webhook verified successfully")
        return result, 200
    else:
        logger.warning("WhatsApp webhook verification failed")
        return jsonify({'message': 'Verification failed'}), 403


@whatsapp_bp.route('/webhook', methods=['POST'])
def whatsapp_webhook():
    """
    Receive incoming messages from WhatsApp webhook.
    """
    data = request.get_json()
    
    if not data or 'entry' not in data:
        return jsonify({'message': 'Invalid request'}), 400
    
    try:
        # Process each entry (can be multiple in one webhook call)
        for entry in data.get('entry', []):
            for change in entry.get('changes', []):
                if change.get('field') == 'messages':
                    messages = change.get('value', {}).get('messages', [])
                    for message in messages:
                        process_whatsapp_message(message, change.get('value'))
        
        return jsonify({'message': 'Webhook processed successfully'}), 200
        
    except Exception as e:
        logger.exception('Error processing WhatsApp webhook')
        return jsonify({'message': 'Processing failed'}), 500


def process_whatsapp_message(message, metadata):
    """Process individual WhatsApp message"""
    try:
        # Extract message details
        phone_number = message.get('from')
        message_id = message.get('id')
        timestamp = message.get('timestamp')
        
        # Get message content based on type
        message_type = message.get('type')
        
        if message_type == 'text':
            text_body = message.get('text', {}).get('body', '')
            handle_text_message(phone_number, text_body, message_id, metadata)
        elif message_type == 'interactive':
            handle_interactive_response(phone_number, message, message_id, metadata)
        elif message_type == 'button':
            handle_button_response(phone_number, message, message_id, metadata)
        else:
            logger.warning(f"Unsupported message type: {message_type}")
            
    except Exception as e:
        logger.exception(f"Error processing WhatsApp message from {phone_number}")


def handle_text_message(phone_number, text_body, message_id, metadata):
    """Handle text messages from WhatsApp"""
    # Log the incoming message
    whatsapp_log = WhatsAppLog(
        phone_number=phone_number,
        message=text_body,
        direction='inbound',
        message_type='text',
        status='received',
        provider='whatsapp_business_api',
        provider_message_id=message_id,
        conversation_id=metadata.get('metadata', {}).get('display_phone_number'),
        meta_data={'metadata': metadata}
    )
    db.session.add(whatsapp_log)
    
    try:
        # Process the command (similar to SMS)
        response_message = process_whatsapp_command(phone_number, text_body)
        
        # Send response
        success, _ = send_whatsapp_notification(phone_number, response_message)
        
        whatsapp_log.status = 'processed' if success else 'failed'
        db.session.commit()
        
    except Exception as e:
        logger.exception(f"Error handling WhatsApp text message from {phone_number}")
        whatsapp_log.status = 'failed'
        whatsapp_log.error_message = str(e)
        db.session.commit()


def handle_interactive_response(phone_number, message, message_id, metadata):
    """Handle interactive message responses (button clicks, list selections)"""
    interactive = message.get('interactive', {})
    interactive_type = interactive.get('type')
    
    if interactive_type == 'button_reply':
        button_reply = interactive.get('button_reply', {})
        button_id = button_reply.get('id')
        button_title = button_reply.get('title')
        handle_button_response(phone_number, button_id, button_title, message_id, metadata)
    elif interactive_type == 'list_reply':
        list_reply = interactive.get('list_reply', {})
        selection_id = list_reply.get('id')
        selection_title = list_reply.get('title')
        handle_list_selection(phone_number, selection_id, selection_title, message_id, metadata)


def handle_button_response(phone_number, button_id, button_title, message_id, metadata):
    """Handle button press responses"""
    # Log the button response
    whatsapp_log = WhatsAppLog(
        phone_number=phone_number,
        message=f"Button pressed: {button_title}",
        direction='inbound',
        message_type='interactive',
        status='received',
        provider='whatsapp_business_api',
        provider_message_id=message_id,
        meta_data={'button_id': button_id, 'button_title': button_title}
    )
    db.session.add(whatsapp_log)
    
    try:
        # Process button action
        response_message = process_button_action(phone_number, button_id, button_title)
        
        # Send response
        success, _ = send_whatsapp_notification(phone_number, response_message)
        
        whatsapp_log.status = 'processed' if success else 'failed'
        db.session.commit()
        
    except Exception as e:
        logger.exception(f"Error handling WhatsApp button response from {phone_number}")
        whatsapp_log.status = 'failed'
        whatsapp_log.error_message = str(e)
        db.session.commit()


def handle_list_selection(phone_number, selection_id, selection_title, message_id, metadata):
    """Handle list item selections"""
    # Log the list selection
    whatsapp_log = WhatsAppLog(
        phone_number=phone_number,
        message=f"Product selected: {selection_title}",
        direction='inbound',
        message_type='interactive',
        status='received',
        provider='whatsapp_business_api',
        provider_message_id=message_id,
        meta_data={'selection_id': selection_id, 'selection_title': selection_title}
    )
    db.session.add(whatsapp_log)
    
    try:
        # Process product selection - initiate ordering flow
        response_message = process_product_selection(phone_number, selection_id, selection_title)
        
        # Send response
        success, _ = send_whatsapp_notification(phone_number, response_message)
        
        whatsapp_log.status = 'processed' if success else 'failed'
        db.session.commit()
        
    except Exception as e:
        logger.exception(f"Error handling WhatsApp list selection from {phone_number}")
        whatsapp_log.status = 'failed'
        whatsapp_log.error_message = str(e)
        db.session.commit()


def process_whatsapp_command(phone_number, message):
    """Process WhatsApp commands from users"""
    message = message.strip().upper()
    
    # Find user by phone number
    user = User.query.filter(User.phone_number == phone_number).first()
    
    if not user:
        return "Welcome to Acreage! To get started, please register on our website or app first."
    
    if user.role != 'buyer':
        return "WhatsApp ordering is currently available for buyers only."
    
    # Parse command
    if message.startswith('ORDER'):
        return handle_whatsapp_order_command(user, message)
    elif message.startswith('STATUS'):
        return handle_status_command(user, message)
    elif message == 'HELP':
        return get_whatsapp_help_message()
    elif message == 'PRODUCTS' or message == 'CATALOG':
        return handle_whatsapp_catalog_command(phone_number)
    elif message == 'MENU':
        return send_whatsapp_menu(phone_number)
    else:
        return "Invalid command. Text HELP for available commands or MENU for interactive menu."


def handle_whatsapp_order_command(user, message):
    """Handle ORDER command via WhatsApp"""
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
        
        # Log the WhatsApp-triggered order
        whatsapp_log = WhatsAppLog(
            phone_number=user.phone_number,
            message=f"Order created via WhatsApp: {order.order_code}",
            direction='outbound',
            message_type='text',
            status='sent',
            provider='whatsapp_business_api',
            related_order_id=order.id,
            related_user_id=user.id
        )
        db.session.add(whatsapp_log)
        db.session.commit()
        
        return f"✅ Order {order.order_code} placed successfully!\n\nTotal: KES {total_amount}\nPlease pay via M-Pesa to complete your order."
        
    except ValueError:
        return "Invalid format. Use: ORDER <product_id> <quantity>. Example: ORDER 123 5"
    except Exception as e:
        logger.exception(f"Error in WhatsApp order command")
        return "Sorry, we couldn't place your order. Please try again."


def handle_status_command(user, message):
    """Handle STATUS command via WhatsApp"""
    try:
        parts = message.split()
        if len(parts) < 2:
            return "Invalid format. Use: STATUS <order_code>. Example: STATUS ACR-ABC123"
        
        order_code = parts[1]
        
        order = Order.query.filter_by(order_code=order_code, buyer_id=user.id).first()
        if not order:
            return f"Order {order_code} not found."
        
        status_text = f"📦 Order {order.order_code}\n\n"
        status_text += f"📊 Status: {order.status.upper()}\n"
        status_text += f"💳 Payment: {order.payment_status.upper()}\n"
        status_text += f"💰 Total: KES {order.total_amount}\n\n"
        status_text += "📋 Items:\n"
        
        if order.items:
            for item in order.items:
                status_text += f"• {item.product.title} x {item.quantity} {item.product.unit}\n"
        
        return status_text.strip()
        
    except Exception as e:
        logger.exception(f"Error in WhatsApp status command")
        return "Sorry, we couldn't retrieve your order status. Please try again."


def handle_whatsapp_catalog_command(phone_number):
    """Handle CATALOG command - send interactive product catalog"""
    try:
        products = Product.query.filter_by(is_available=True).limit(9).all()
        
        if not products:
            return "No products currently available."
        
        provider = get_whatsapp_provider()
        success, _ = provider.send_product_catalog(phone_number, products)
        
        if success:
            return "📱 Product catalog sent! Please select a product to order."
        else:
            return "Sorry, couldn't send product catalog. Please try again."
        
    except Exception as e:
        logger.exception(f"Error in WhatsApp catalog command")
        return "Sorry, we couldn't retrieve product information. Please try again."


def send_whatsapp_menu(phone_number):
    """Send interactive menu with main options"""
    try:
        provider = get_whatsapp_provider()
        success, _ = provider.send_interactive_message(
            phone_number,
            "🌾 Acreage Menu",
            "Choose an option to get started:",
            ["📦 Browse Products", "📊 My Orders", "❓ Help"]
        )
        
        if success:
            return "📱 Menu sent! Please select an option."
        else:
            return "Sorry, couldn't send menu. Please try again."
        
    except Exception as e:
        logger.exception(f"Error sending WhatsApp menu")
        return "Sorry, couldn't send menu. Please try again."


def process_button_action(phone_number, button_id, button_title):
    """Process button press actions"""
    if 'BROWSE' in button_title.upper():
        return handle_whatsapp_catalog_command(phone_number)
    elif 'ORDERS' in button_title.upper():
        return "To check your orders, text STATUS <order_code>. Example: STATUS ACR-ABC123"
    elif 'HELP' in button_title.upper():
        return get_whatsapp_help_message()
    else:
        return "Unknown action. Please try again."


def process_product_selection(phone_number, product_id, product_title):
    """Process product selection from catalog"""
    try:
        product = db.session.get(Product, int(product_id))
        if not product:
            return f"Product not found. Please try again."
        
        # Ask for quantity
        return f"You selected: {product_title}\n\nPrice: KES {product.price_per_unit}/{product.unit}\nAvailable: {product.stock_quantity} {product.unit}\n\nTo order, text: ORDER {product_id} <quantity>\nExample: ORDER {product_id} 5"
        
    except Exception as e:
        logger.exception(f"Error processing product selection")
        return "Sorry, couldn't process your selection. Please try again."


def get_whatsapp_help_message():
    """Return help message with available WhatsApp commands"""
    return (
        "🌾 *Acreage WhatsApp Commands*\n\n"
        "📦 *Ordering*\n"
        "• ORDER <id> <qty> - Place order\n"
        "  Example: ORDER 123 5\n\n"
        "📊 *Status*\n"
        "• STATUS <code> - Check order status\n"
        "  Example: STATUS ACR-ABC123\n\n"
        "🛒 *Browse*\n"
        "• PRODUCTS - Get product list\n"
        "• CATALOG - Interactive catalog\n"
        "• MENU - Interactive menu\n\n"
        "❓ *Help*\n"
        "• HELP - Show this message"
    )


def generate_order_code():
    """Generate a random 6-character order code"""
    import random
    import string
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


@whatsapp_bp.route('/send-test', methods=['POST'])
def send_test_whatsapp():
    """
    Development endpoint to test WhatsApp sending.
    Only available in development mode.
    """
    if current_app.config.get('IS_PROD'):
        return jsonify({'message': 'Not available in production'}), 403
    
    data = request.get_json()
    phone_number = data.get('phone_number')
    message = data.get('message')
    
    if not phone_number or not message:
        return jsonify({'message': 'phone_number and message required'}), 400
    
    success, whatsapp_log = send_whatsapp_notification(phone_number, message)
    
    if success:
        return jsonify({
            'message': 'Test WhatsApp sent successfully',
            'whatsapp_log': whatsapp_log.to_dict() if whatsapp_log else None
        }), 200
    else:
        return jsonify({
            'message': 'Failed to send test WhatsApp',
            'whatsapp_log': whatsapp_log.to_dict() if whatsapp_log else None
        }), 500


@whatsapp_bp.route('/logs', methods=['GET'])
def get_whatsapp_logs():
    """Get WhatsApp logs (admin only - simplified for now)"""
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    
    logs = WhatsAppLog.query.order_by(WhatsAppLog.created_at.desc()).paginate(
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