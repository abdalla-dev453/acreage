import os
import logging
import requests
from app import db
from app.models.sms_log import SMSLog
from flask import current_app

logger = logging.getLogger(__name__)


class SMSProvider:
    """Base class for SMS providers"""
    
    def send_sms(self, phone_number, message, related_order_id=None, related_user_id=None):
        """Send SMS and log the attempt"""
        raise NotImplementedError("Subclasses must implement send_sms")


class AfricaSTalkingProvider(SMSProvider):
    """Africa's Talking SMS provider implementation"""
    
    def __init__(self):
        self.username = os.getenv('AT_USERNAME', '')
        self.api_key = os.getenv('AT_API_KEY', '')
        self.base_url = 'https://api.africastalking.com/version1/messaging'
    
    def send_sms(self, phone_number, message, related_order_id=None, related_user_id=None):
        try:
            # Clean phone number to international format
            clean_phone = self._clean_phone_number(phone_number)
            
            payload = {
                'username': self.username,
                'to': clean_phone,
                'message': message,
                'from': os.getenv('AT_SENDER_ID', 'ACREAGE')
            }
            
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'apiKey': self.api_key
            }
            
            response = requests.post(self.base_url, data=payload, headers=headers, timeout=10)
            response_data = response.json()
            
            # Log the SMS attempt
            sms_log = SMSLog(
                phone_number=clean_phone,
                message=message,
                direction='outbound',
                status='sent' if response.status_code == 200 else 'failed',
                provider='africas_talking',
                provider_message_id=response_data.get('SMSMessageData', {}).get('Recipients', [{}])[0].get('messageId'),
                cost=response_data.get('SMSMessageData', {}).get('Recipients', [{}])[0].get('cost'),
                related_order_id=related_order_id,
                related_user_id=related_user_id,
                error_message=response_data.get('errorMessage') if response.status_code != 200 else None
            )
            db.session.add(sms_log)
            db.session.commit()
            
            if response.status_code == 200:
                logger.info(f"SMS sent successfully to {clean_phone}", extra={
                    'provider': 'africas_talking',
                    'message_id': sms_log.provider_message_id
                })
                return True, sms_log
            else:
                logger.error(f"SMS sending failed to {clean_phone}", extra={
                    'provider': 'africas_talking',
                    'error': response_data.get('errorMessage')
                })
                return False, sms_log
                
        except Exception as e:
            logger.exception(f"SMS sending error to {phone_number}", extra={'provider': 'africas_talking'})
            # Log failed attempt
            sms_log = SMSLog(
                phone_number=phone_number,
                message=message,
                direction='outbound',
                status='failed',
                provider='africas_talking',
                related_order_id=related_order_id,
                related_user_id=related_user_id,
                error_message=str(e)
            )
            db.session.add(sms_log)
            db.session.commit()
            return False, sms_log
    
    def _clean_phone_number(self, phone):
        """Convert phone number to international format (254...)"""
        phone = str(phone).strip().replace('+', '').replace(' ', '').replace('-', '')
        if phone.startswith('0'):
            return '254' + phone[1:]
        elif phone.startswith('7') or phone.startswith('1'):
            return '254' + phone
        return phone


class TwilioProvider(SMSProvider):
    """Twilio SMS provider implementation"""
    
    def __init__(self):
        self.account_sid = os.getenv('TWILIO_ACCOUNT_SID', '')
        self.auth_token = os.getenv('TWILIO_AUTH_TOKEN', '')
        self.from_number = os.getenv('TWILIO_FROM_NUMBER', '')
        self.base_url = f'https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json'
    
    def send_sms(self, phone_number, message, related_order_id=None, related_user_id=None):
        try:
            clean_phone = self._clean_phone_number(phone_number)
            
            payload = {
                'From': self.from_number,
                'To': clean_phone,
                'Body': message
            }
            
            response = requests.post(
                self.base_url,
                data=payload,
                auth=(self.account_sid, self.auth_token),
                timeout=10
            )
            response_data = response.json()
            
            # Log the SMS attempt
            sms_log = SMSLog(
                phone_number=clean_phone,
                message=message,
                direction='outbound',
                status='sent' if response.status_code in [200, 201] else 'failed',
                provider='twilio',
                provider_message_id=response_data.get('sid'),
                cost=response_data.get('price'),
                related_order_id=related_order_id,
                related_user_id=related_user_id,
                error_message=response_data.get('error_message') if response.status_code not in [200, 201] else None
            )
            db.session.add(sms_log)
            db.session.commit()
            
            if response.status_code in [200, 201]:
                logger.info(f"SMS sent successfully to {clean_phone}", extra={
                    'provider': 'twilio',
                    'message_id': sms_log.provider_message_id
                })
                return True, sms_log
            else:
                logger.error(f"SMS sending failed to {clean_phone}", extra={
                    'provider': 'twilio',
                    'error': response_data.get('error_message')
                })
                return False, sms_log
                
        except Exception as e:
            logger.exception(f"SMS sending error to {phone_number}", extra={'provider': 'twilio'})
            sms_log = SMSLog(
                phone_number=phone_number,
                message=message,
                direction='outbound',
                status='failed',
                provider='twilio',
                related_order_id=related_order_id,
                related_user_id=related_user_id,
                error_message=str(e)
            )
            db.session.add(sms_log)
            db.session.commit()
            return False, sms_log
    
    def _clean_phone_number(self, phone):
        """Convert phone number to international format (+254...)"""
        phone = str(phone).strip().replace(' ', '').replace('-', '')
        if phone.startswith('0'):
            return '+254' + phone[1:]
        elif phone.startswith('7') or phone.startswith('1'):
            return '+254' + phone
        elif phone.startswith('254'):
            return '+' + phone
        return phone


class MockSMSProvider(SMSProvider):
    """Mock SMS provider for development/testing - logs to console instead of sending"""
    
    def send_sms(self, phone_number, message, related_order_id=None, related_user_id=None):
        try:
            logger.info(f"[MOCK SMS] To: {phone_number}, Message: {message[:50]}...")
            
            sms_log = SMSLog(
                phone_number=phone_number,
                message=message,
                direction='outbound',
                status='sent',
                provider='mock',
                related_order_id=related_order_id,
                related_user_id=related_user_id
            )
            db.session.add(sms_log)
            db.session.commit()
            
            return True, sms_log
        except Exception as e:
            logger.exception(f"Mock SMS error to {phone_number}")
            return False, None


def get_sms_provider():
    """Factory function to get the configured SMS provider"""
    provider_name = os.getenv('SMS_PROVIDER', 'mock').lower()
    
    if provider_name == 'africas_talking':
        return AfricaSTalkingProvider()
    elif provider_name == 'twilio':
        return TwilioProvider()
    else:
        return MockSMSProvider()


def send_sms_notification(phone_number, message, related_order_id=None, related_user_id=None):
    """
    Send SMS notification using the configured provider.
    Returns tuple (success: bool, sms_log: SMSLog or None)
    """
    provider = get_sms_provider()
    return provider.send_sms(phone_number, message, related_order_id, related_user_id)


def send_order_status_sms(order, new_status):
    """Send SMS notification when order status changes"""
    if not order.buyer or not order.buyer.phone_number:
        logger.warning(f"Cannot send order status SMS - no buyer phone for order {order.id}")
        return False, None
    
    status_messages = {
        'pending': f"Your order {order.order_code} has been received and is pending payment.",
        'on delivery': f"Your order {order.order_code} is now on delivery!",
        'delivered': f"Your order {order.order_code} has been delivered. Thank you for shopping with Acreage!",
        'cancelled': f"Your order {order.order_code} has been cancelled."
    }
    
    message = status_messages.get(new_status.lower(), f"Your order {order.order_code} status is now: {new_status}")
    
    return send_sms_notification(
        order.buyer.phone,
        message,
        related_order_id=order.id,
        related_user_id=order.buyer_id
    )


def send_payment_confirmation_sms(order):
    """Send SMS confirmation when payment is received"""
    if not order.buyer or not order.buyer.phone_number:
        logger.warning(f"Cannot send payment SMS - no buyer phone for order {order.id}")
        return False, None
    
    message = f"Payment received for order {order.order_code}. Amount: KES {order.total_amount}. Your order is being processed."
    
    return send_sms_notification(
        order.buyer.phone,
        message,
        related_order_id=order.id,
        related_user_id=order.buyer_id
    )