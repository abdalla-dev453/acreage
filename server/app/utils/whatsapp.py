import os
import logging
import requests
from app import db
from app.models.whatsapp_log import WhatsAppLog
from flask import current_app

logger = logging.getLogger(__name__)


class WhatsAppBusinessAPI:
    """WhatsApp Business API integration for Acreage"""
    
    def __init__(self):
        self.access_token = os.getenv('WHATSAPP_ACCESS_TOKEN', '')
        self.phone_number_id = os.getenv('WHATSAPP_PHONE_NUMBER_ID', '')
        self.api_version = os.getenv('WHATSAPP_API_VERSION', 'v18.0')
        self.base_url = f"https://graph.facebook.com/{self.api_version}"
        self.webhook_verify_token = os.getenv('WHATSAPP_WEBHOOK_VERIFY_TOKEN', '')
    
    def send_text_message(self, phone_number, message, related_order_id=None, related_user_id=None):
        """Send a text message via WhatsApp Business API"""
        try:
            clean_phone = self._clean_phone_number(phone_number)
            
            payload = {
                "messaging_product": "whatsapp",
                "to": clean_phone,
                "type": "text",
                "text": {
                    "body": message
                }
            }
            
            response = self._send_request(payload)
            
            # Log the WhatsApp message
            whatsapp_log = WhatsAppLog(
                phone_number=clean_phone,
                message=message,
                direction='outbound',
                message_type='text',
                status='sent' if response.get('success') else 'failed',
                provider='whatsapp_business_api',
                provider_message_id=response.get('message_id'),
                related_order_id=related_order_id,
                related_user_id=related_user_id,
                error_message=response.get('error') if not response.get('success') else None,
                meta_data=response
            )
            db.session.add(whatsapp_log)
            db.session.commit()
            
            if response.get('success'):
                logger.info(f"WhatsApp text sent successfully to {clean_phone}", extra={
                    'message_id': response.get('message_id')
                })
                return True, whatsapp_log
            else:
                logger.error(f"WhatsApp text sending failed to {clean_phone}", extra={
                    'error': response.get('error')
                })
                return False, whatsapp_log
                
        except Exception as e:
            logger.exception(f"WhatsApp text sending error to {phone_number}")
            whatsapp_log = WhatsAppLog(
                phone_number=phone_number,
                message=message,
                direction='outbound',
                message_type='text',
                status='failed',
                provider='whatsapp_business_api',
                related_order_id=related_order_id,
                related_user_id=related_user_id,
                error_message=str(e)
            )
            db.session.add(whatsapp_log)
            db.session.commit()
            return False, whatsapp_log
    
    def send_template_message(self, phone_number, template_name, components=None, related_order_id=None, related_user_id=None):
        """Send a template message via WhatsApp Business API"""
        try:
            clean_phone = self._clean_phone_number(phone_number)
            
            payload = {
                "messaging_product": "whatsapp",
                "to": clean_phone,
                "type": "template",
                "template": {
                    "name": template_name,
                    "language": {"code": "en"}
                }
            }
            
            if components:
                payload["template"]["components"] = components
            
            response = self._send_request(payload)
            
            # Log the template message
            whatsapp_log = WhatsAppLog(
                phone_number=clean_phone,
                message=f"Template: {template_name}",
                direction='outbound',
                message_type='template',
                status='sent' if response.get('success') else 'failed',
                provider='whatsapp_business_api',
                provider_message_id=response.get('message_id'),
                template_name=template_name,
                related_order_id=related_order_id,
                related_user_id=related_user_id,
                error_message=response.get('error') if not response.get('success') else None,
                meta_data=response
            )
            db.session.add(whatsapp_log)
            db.session.commit()
            
            if response.get('success'):
                logger.info(f"WhatsApp template sent successfully to {clean_phone}", extra={
                    'template': template_name,
                    'message_id': response.get('message_id')
                })
                return True, whatsapp_log
            else:
                logger.error(f"WhatsApp template sending failed to {clean_phone}", extra={
                    'template': template_name,
                    'error': response.get('error')
                })
                return False, whatsapp_log
                
        except Exception as e:
            logger.exception(f"WhatsApp template sending error to {phone_number}")
            whatsapp_log = WhatsAppLog(
                phone_number=phone_number,
                message=f"Template: {template_name}",
                direction='outbound',
                message_type='template',
                status='failed',
                provider='whatsapp_business_api',
                template_name=template_name,
                related_order_id=related_order_id,
                related_user_id=related_user_id,
                error_message=str(e)
            )
            db.session.add(whatsapp_log)
            db.session.commit()
            return False, whatsapp_log
    
    def send_interactive_message(self, phone_number, header_text, body_text, buttons, related_order_id=None, related_user_id=None):
        """Send an interactive message with buttons via WhatsApp Business API"""
        try:
            clean_phone = self._clean_phone_number(phone_number)
            
            # Format buttons for WhatsApp API
            button_objects = []
            for i, button in enumerate(buttons):
                button_objects.append({
                    "type": "reply",
                    "reply": {
                        "id": f"button_{i}",
                        "title": button
                    }
                })
            
            payload = {
                "messaging_product": "whatsapp",
                "to": clean_phone,
                "type": "interactive",
                "interactive": {
                    "type": "button",
                    "header": {
                        "type": "text",
                        "text": header_text
                    },
                    "body": {
                        "text": body_text
                    },
                    "action": {
                        "buttons": button_objects
                    }
                }
            }
            
            response = self._send_request(payload)
            
            # Log the interactive message
            whatsapp_log = WhatsAppLog(
                phone_number=clean_phone,
                message=f"Interactive: {header_text}",
                direction='outbound',
                message_type='interactive',
                status='sent' if response.get('success') else 'failed',
                provider='whatsapp_business_api',
                provider_message_id=response.get('message_id'),
                related_order_id=related_order_id,
                related_user_id=related_user_id,
                error_message=response.get('error') if not response.get('success') else None,
                meta_data=response
            )
            db.session.add(whatsapp_log)
            db.session.commit()
            
            if response.get('success'):
                logger.info(f"WhatsApp interactive sent successfully to {clean_phone}", extra={
                    'message_id': response.get('message_id')
                })
                return True, whatsapp_log
            else:
                logger.error(f"WhatsApp interactive sending failed to {clean_phone}", extra={
                    'error': response.get('error')
                })
                return False, whatsapp_log
                
        except Exception as e:
            logger.exception(f"WhatsApp interactive sending error to {phone_number}")
            whatsapp_log = WhatsAppLog(
                phone_number=phone_number,
                message=f"Interactive: {header_text}",
                direction='outbound',
                message_type='interactive',
                status='failed',
                provider='whatsapp_business_api',
                related_order_id=related_order_id,
                related_user_id=related_user_id,
                error_message=str(e)
            )
            db.session.add(whatsapp_log)
            db.session.commit()
            return False, whatsapp_log
    
    def send_product_catalog(self, phone_number, products, related_order_id=None, related_user_id=None):
        """Send product catalog as list message via WhatsApp Business API"""
        try:
            clean_phone = self._clean_phone_number(phone_number)
            
            # Format products for WhatsApp list
            sections = []
            for i, product in enumerate(products):
                if i % 10 == 0:  # WhatsApp allows max 10 items per section
                    if sections:
                        sections[-1]['title'] = f"Products {len(sections)}"
                    sections.append({
                        "title": f"Products {len(sections) + 1}",
                        "rows": []
                    })
                
                sections[-1]['rows'].append({
                    "id": str(product.id),
                    "title": product.title,
                    "description": f"KES {product.price_per_unit}/{product.unit} - Stock: {product.stock_quantity}"
                })
            
            payload = {
                "messaging_product": "whatsapp",
                "to": clean_phone,
                "type": "interactive",
                "interactive": {
                    "type": "list",
                    "header": {
                        "type": "text",
                        "text": "Acreage Products"
                    },
                    "body": {
                        "text": "Browse our available products and select to order:"
                    },
                    "footer": {
                        "text": "Reply with product details to place an order"
                    },
                    "action": {
                        "button": "View Products",
                        "sections": sections[:1]  # WhatsApp limits to 1 section for now
                    }
                }
            }
            
            response = self._send_request(payload)
            
            # Log the catalog message
            whatsapp_log = WhatsAppLog(
                phone_number=clean_phone,
                message=f"Product catalog with {len(products)} items",
                direction='outbound',
                message_type='interactive',
                status='sent' if response.get('success') else 'failed',
                provider='whatsapp_business_api',
                provider_message_id=response.get('message_id'),
                related_order_id=related_order_id,
                related_user_id=related_user_id,
                error_message=response.get('error') if not response.get('success') else None,
                meta_data={'product_count': len(products), **response}
            )
            db.session.add(whatsapp_log)
            db.session.commit()
            
            if response.get('success'):
                logger.info(f"WhatsApp catalog sent successfully to {clean_phone}", extra={
                    'product_count': len(products),
                    'message_id': response.get('message_id')
                })
                return True, whatsapp_log
            else:
                logger.error(f"WhatsApp catalog sending failed to {clean_phone}", extra={
                    'error': response.get('error')
                })
                return False, whatsapp_log
                
        except Exception as e:
            logger.exception(f"WhatsApp catalog sending error to {phone_number}")
            whatsapp_log = WhatsAppLog(
                phone_number=phone_number,
                message=f"Product catalog with {len(products)} items",
                direction='outbound',
                message_type='interactive',
                status='failed',
                provider='whatsapp_business_api',
                related_order_id=related_order_id,
                related_user_id=related_user_id,
                error_message=str(e)
            )
            db.session.add(whatsapp_log)
            db.session.commit()
            return False, whatsapp_log
    
    def _send_request(self, payload):
        """Send request to WhatsApp Business API"""
        try:
            url = f"{self.base_url}/{self.phone_number_id}/messages"
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
            
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            
            if response.status_code in [200, 201]:
                data = response.json()
                return {
                    'success': True,
                    'message_id': data.get('messages', [{}])[0].get('id'),
                    'status': data.get('messages', [{}])[0].get('status')
                }
            else:
                error_data = response.json()
                return {
                    'success': False,
                    'error': error_data.get('error', {}).get('message', 'Unknown error'),
                    'status_code': response.status_code
                }
                
        except requests.RequestException as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _clean_phone_number(self, phone):
        """Convert phone number to WhatsApp format (254...)"""
        phone = str(phone).strip().replace('+', '').replace(' ', '').replace('-', '')
        if phone.startswith('0'):
            return '254' + phone[1:]
        elif phone.startswith('7') or phone.startswith('1'):
            return '254' + phone
        return phone
    
    def verify_webhook(self, mode, token, challenge):
        """Verify WhatsApp webhook setup"""
        if mode == 'subscribe' and token == self.webhook_verify_token:
            return challenge
        return None


class MockWhatsAppProvider:
    """Mock WhatsApp provider for development/testing"""
    
    def send_text_message(self, phone_number, message, related_order_id=None, related_user_id=None):
        try:
            logger.info(f"[MOCK WHATSAPP] To: {phone_number}, Message: {message[:50]}...")
            
            whatsapp_log = WhatsAppLog(
                phone_number=phone_number,
                message=message,
                direction='outbound',
                message_type='text',
                status='sent',
                provider='mock_whatsapp',
                related_order_id=related_order_id,
                related_user_id=related_user_id
            )
            db.session.add(whatsapp_log)
            db.session.commit()
            
            return True, whatsapp_log
        except Exception as e:
            logger.exception(f"Mock WhatsApp error to {phone_number}")
            return False, None
    
    def send_template_message(self, phone_number, template_name, components=None, related_order_id=None, related_user_id=None):
        return self.send_text_message(phone_number, f"Template: {template_name}", related_order_id, related_user_id)
    
    def send_interactive_message(self, phone_number, header_text, body_text, buttons, related_order_id=None, related_user_id=None):
        return self.send_text_message(phone_number, f"{header_text}: {body_text}", related_order_id, related_user_id)
    
    def send_product_catalog(self, phone_number, products, related_order_id=None, related_user_id=None):
        message = f"Product catalog with {len(products)} items"
        return self.send_text_message(phone_number, message, related_order_id, related_user_id)
    
    def verify_webhook(self, mode, token, challenge):
        return challenge if token == 'test_token' else None


def get_whatsapp_provider():
    """Factory function to get the configured WhatsApp provider"""
    provider_name = os.getenv('WHATSAPP_PROVIDER', 'mock').lower()
    
    if provider_name == 'whatsapp_business_api':
        return WhatsAppBusinessAPI()
    else:
        return MockWhatsAppProvider()


def send_whatsapp_notification(phone_number, message, related_order_id=None, related_user_id=None):
    """
    Send WhatsApp notification using the configured provider.
    Returns tuple (success: bool, whatsapp_log: WhatsAppLog or None)
    """
    provider = get_whatsapp_provider()
    return provider.send_text_message(phone_number, message, related_order_id, related_user_id)


def send_order_status_whatsapp(order, new_status):
    """Send WhatsApp notification when order status changes"""
    if not order.buyer or not order.buyer.phone_number:
        logger.warning(f"Cannot send order status WhatsApp - no buyer phone for order {order.id}")
        return False, None
    
    status_messages = {
        'pending': f"Your order {order.order_code} has been received and is pending payment.",
        'on delivery': f"Your order {order.order_code} is now on delivery! 🚚",
        'delivered': f"Your order {order.order_code} has been delivered. Thank you for shopping with Acreage! 🌾",
        'cancelled': f"Your order {order.order_code} has been cancelled."
    }
    
    message = status_messages.get(new_status.lower(), f"Your order {order.order_code} status is now: {new_status}")
    
    return send_whatsapp_notification(
        order.buyer.phone_number,
        message,
        related_order_id=order.id,
        related_user_id=order.buyer_id
    )


def send_payment_confirmation_whatsapp(order):
    """Send WhatsApp confirmation when payment is received"""
    if not order.buyer or not order.buyer.phone_number:
        logger.warning(f"Cannot send payment WhatsApp - no buyer phone for order {order.id}")
        return False, None
    
    message = f"Payment received for order {order.order_code}. Amount: KES {order.total_amount}. Your order is being processed. 💰"
    
    return send_whatsapp_notification(
        order.buyer.phone_number,
        message,
        related_order_id=order.id,
        related_user_id=order.buyer_id
    )