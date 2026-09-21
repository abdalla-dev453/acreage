from datetime import datetime
from app import db


class PriceAlert(db.Model):
    """Model for price alerts that notify farmers when market conditions meet their criteria."""
    __tablename__ = 'price_alerts'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False, index=True)
    alert_type = db.Column(db.String(20), nullable=False)  # 'price_above', 'price_below', 'price_change', 'demand_high'
    threshold_value = db.Column(db.Float, nullable=True)  # Price threshold for alerts
    threshold_percent = db.Column(db.Float, nullable=True)  # Percentage change threshold
    category = db.Column(db.String(50), nullable=True)  # Category-based alerts
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    is_triggered = db.Column(db.Boolean, nullable=False, default=False)
    last_triggered_at = db.Column(db.DateTime, nullable=True)
    notification_method = db.Column(db.String(20), nullable=False, default='both')  # 'sms', 'whatsapp', 'both'
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = db.relationship('User', backref='price_alerts')
    product = db.relationship('Product', backref='price_alerts')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'product_id': self.product_id,
            'alert_type': self.alert_type,
            'threshold_value': self.threshold_value,
            'threshold_percent': self.threshold_percent,
            'category': self.category,
            'is_active': self.is_active,
            'is_triggered': self.is_triggered,
            'last_triggered_at': self.last_triggered_at.isoformat() if self.last_triggered_at else None,
            'notification_method': self.notification_method,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }