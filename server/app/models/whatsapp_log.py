from datetime import datetime
from app import db


class WhatsAppLog(db.Model):
    """Model for tracking all WhatsApp communications for audit and compliance."""
    __tablename__ = 'whatsapp_logs'

    id = db.Column(db.Integer, primary_key=True)
    phone_number = db.Column(db.String(20), nullable=False, index=True)
    message = db.Column(db.Text, nullable=False)
    direction = db.Column(db.String(10), nullable=False)  # 'inbound' or 'outbound'
    message_type = db.Column(db.String(20), nullable=False)  # 'text', 'image', 'interactive', 'template'
    status = db.Column(db.String(20), nullable=False)  # 'sent', 'delivered', 'read', 'failed', 'received'
    provider = db.Column(db.String(50), nullable=False)  # 'whatsapp_business_api'
    provider_message_id = db.Column(db.String(100), nullable=True)  # WhatsApp message ID
    conversation_id = db.Column(db.String(100), nullable=True)  # WhatsApp conversation ID
    template_name = db.Column(db.String(100), nullable=True)  # Template name if using template
    related_order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=True)
    related_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    error_message = db.Column(db.Text, nullable=True)
    meta_data = db.Column(db.JSON, nullable=True)  # Additional metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    order = db.relationship('Order', backref='whatsapp_logs')
    user = db.relationship('User', backref='whatsapp_logs')

    def to_dict(self):
        return {
            'id': self.id,
            'phone_number': self.phone_number,
            'message': self.message,
            'direction': self.direction,
            'message_type': self.message_type,
            'status': self.status,
            'provider': self.provider,
            'provider_message_id': self.provider_message_id,
            'conversation_id': self.conversation_id,
            'template_name': self.template_name,
            'related_order_id': self.related_order_id,
            'related_user_id': self.related_user_id,
            'error_message': self.error_message,
            'metadata': self.meta_data,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }