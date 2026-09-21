from datetime import datetime
from app import db


class SMSLog(db.Model):
    """Model for tracking all SMS communications for audit and compliance."""
    __tablename__ = 'sms_logs'

    id = db.Column(db.Integer, primary_key=True)
    phone_number = db.Column(db.String(20), nullable=False, index=True)
    message = db.Column(db.Text, nullable=False)
    direction = db.Column(db.String(10), nullable=False)  # 'inbound' or 'outbound'
    status = db.Column(db.String(20), nullable=False)  # 'sent', 'delivered', 'failed', 'received'
    provider = db.Column(db.String(50), nullable=False)  # 'africas_talking', 'twilio', etc.
    provider_message_id = db.Column(db.String(100), nullable=True)  # External provider message ID
    cost = db.Column(db.Float, nullable=True)  # Cost in KES
    related_order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=True)
    related_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    error_message = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    order = db.relationship('Order', backref='sms_logs')
    user = db.relationship('User', backref='sms_logs')

    def to_dict(self):
        return {
            'id': self.id,
            'phone_number': self.phone_number,
            'message': self.message,
            'direction': self.direction,
            'status': self.status,
            'provider': self.provider,
            'provider_message_id': self.provider_message_id,
            'cost': self.cost,
            'related_order_id': self.related_order_id,
            'related_user_id': self.related_user_id,
            'error_message': self.error_message,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }