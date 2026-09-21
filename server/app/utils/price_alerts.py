import logging
from app import db
from app.models.price_alert import PriceAlert
from app.models.product import Product
from app.models.user import User
from app.utils.sms import send_sms_notification
from app.utils.whatsapp import send_whatsapp_notification
from app.utils.time import utcnow
from datetime import timedelta

logger = logging.getLogger(__name__)


class PriceAlertManager:
    """Manages price alerts for farmers and buyers"""
    
    def __init__(self):
        self.alert_types = {
            'price_above': 'Price goes above threshold',
            'price_below': 'Price goes below threshold',
            'price_change': 'Price changes by percentage',
            'demand_high': 'High demand for product'
        }
    
    def create_alert(self, user_id, product_id, alert_type, threshold_value=None, 
                     threshold_percent=None, notification_method='both'):
        """Create a new price alert for a user"""
        try:
            # Validate alert type
            if alert_type not in self.alert_types:
                raise ValueError(f"Invalid alert type: {alert_type}")
            
            # Validate thresholds based on alert type
            if alert_type in ['price_above', 'price_below'] and threshold_value is None:
                raise ValueError(f"threshold_value required for {alert_type}")
            
            if alert_type == 'price_change' and threshold_percent is None:
                raise ValueError("threshold_percent required for price_change alerts")
            
            # Check if similar alert already exists
            existing_alert = PriceAlert.query.filter_by(
                user_id=user_id,
                product_id=product_id,
                alert_type=alert_type,
                is_active=True
            ).first()
            
            if existing_alert:
                # Update existing alert
                existing_alert.threshold_value = threshold_value
                existing_alert.threshold_percent = threshold_percent
                existing_alert.notification_method = notification_method
                existing_alert.updated_at = utcnow()
                db.session.commit()
                return existing_alert
            
            # Create new alert
            alert = PriceAlert(
                user_id=user_id,
                product_id=product_id,
                alert_type=alert_type,
                threshold_value=threshold_value,
                threshold_percent=threshold_percent,
                notification_method=notification_method
            )
            
            db.session.add(alert)
            db.session.commit()
            
            logger.info(f"Created price alert {alert.id} for user {user_id} on product {product_id}")
            return alert
            
        except Exception as e:
            logger.exception(f"Error creating price alert for user {user_id}")
            db.session.rollback()
            raise
    
    def check_and_trigger_alerts(self):
        """Check all active alerts and trigger those that meet conditions"""
        try:
            active_alerts = PriceAlert.query.filter_by(is_active=True, is_triggered=False).all()
            
            triggered_count = 0
            for alert in active_alerts:
                if self._should_trigger_alert(alert):
                    self._trigger_alert(alert)
                    triggered_count += 1
            
            logger.info(f"Checked {len(active_alerts)} alerts, triggered {triggered_count}")
            return triggered_count
            
        except Exception as e:
            logger.exception("Error checking and triggering price alerts")
            return 0
    
    def _should_trigger_alert(self, alert):
        """Determine if an alert should be triggered based on current conditions"""
        try:
            product = db.session.get(Product, alert.product_id)
            if not product or not product.is_available:
                return False
            
            if alert.alert_type == 'price_above':
                return product.price_per_unit >= alert.threshold_value
            
            elif alert.alert_type == 'price_below':
                return product.price_per_unit <= alert.threshold_value
            
            elif alert.alert_type == 'price_change':
                # Check if price changed by specified percentage in last 24 hours
                # This would require historical price data - simplified for now
                return False
            
            elif alert.alert_type == 'demand_high':
                # Check if product has high demand (low stock relative to recent orders)
                return product.stock_quantity < 10  # Simplified threshold
            
            return False
            
        except Exception as e:
            logger.exception(f"Error checking alert {alert.id}")
            return False
    
    def _trigger_alert(self, alert):
        """Trigger an alert by sending notifications"""
        try:
            user = db.session.get(User, alert.user_id)
            product = db.session.get(Product, alert.product_id)
            
            if not user or not product:
                logger.warning(f"Cannot trigger alert {alert.id}: user or product not found")
                return
            
            # Generate alert message
            message = self._generate_alert_message(alert, product)
            
            # Send notifications based on user preference
            if alert.notification_method in ['sms', 'both']:
                if user.phone_number:
                    send_sms_notification(
                        user.phone_number,
                        message,
                        related_product_id=product.id,
                        related_user_id=user.id
                    )
            
            if alert.notification_method in ['whatsapp', 'both']:
                if user.phone_number:
                    send_whatsapp_notification(
                        user.phone_number,
                        message,
                        related_product_id=product.id,
                        related_user_id=user.id
                    )
            
            # Mark alert as triggered
            alert.is_triggered = True
            alert.last_triggered_at = utcnow()
            db.session.commit()
            
            logger.info(f"Triggered price alert {alert.id} for user {user.username}")
            
        except Exception as e:
            logger.exception(f"Error triggering alert {alert.id}")
            db.session.rollback()
    
    def _generate_alert_message(self, alert, product):
        """Generate appropriate message for the alert"""
        if alert.alert_type == 'price_above':
            return (
                f"📈 Price Alert: {product.title}\n\n"
                f"Price has reached KES {product.price_per_unit}/{product.unit} "
                f"(above your threshold of KES {alert.threshold_value})\n\n"
                f"Consider selling now to maximize profits!"
            )
        
        elif alert.alert_type == 'price_below':
            return (
                f"📉 Price Alert: {product.title}\n\n"
                f"Price has dropped to KES {product.price_per_unit}/{product.unit} "
                f"(below your threshold of KES {alert.threshold_value})\n\n"
                f"Good time to buy if you need this product."
            )
        
        elif alert.alert_type == 'demand_high':
            return (
                f"🔥 High Demand Alert: {product.title}\n\n"
                f"Your product is in high demand! "
                f"Only {product.stock_quantity} {product.unit} remaining.\n\n"
                f"Consider increasing stock or raising prices."
            )
        
        elif alert.alert_type == 'price_change':
            return (
                f"📊 Price Change Alert: {product.title}\n\n"
                f"Price has changed by {alert.threshold_percent}% "
                f"Current price: KES {product.price_per_unit}/{product.unit}"
            )
        
        return f"Price alert for {product.title}"
    
    def get_user_alerts(self, user_id, active_only=True):
        """Get all alerts for a specific user"""
        query = PriceAlert.query.filter_by(user_id=user_id)
        if active_only:
            query = query.filter_by(is_active=True)
        
        return query.order_by(PriceAlert.created_at.desc()).all()
    
    def deactivate_alert(self, alert_id, user_id):
        """Deactivate a specific alert"""
        alert = PriceAlert.query.filter_by(id=alert_id, user_id=user_id).first()
        if alert:
            alert.is_active = False
            db.session.commit()
            return True
        return False
    
    def delete_alert(self, alert_id, user_id):
        """Delete a specific alert"""
        alert = PriceAlert.query.filter_by(id=alert_id, user_id=user_id).first()
        if alert:
            db.session.delete(alert)
            db.session.commit()
            return True
        return False


# Global alert manager instance
alert_manager = PriceAlertManager()