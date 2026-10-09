from datetime import datetime
from app import db
from sqlalchemy import Enum

class OrderStatusHistory(db.Model):
    __tablename__ = "order_status_history"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False, index=True)
    previous_status = db.Column(db.String(30), nullable=False)
    new_status = db.Column(db.String(30), nullable=False)
    changed_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    changed_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    reason = db.Column(db.String(255), nullable=True)
    request_id = db.Column(db.String(100), nullable=True)

    # Relationships
    order = db.relationship('Order', back_populates='status_history')
    changed_by = db.relationship('User')

    def to_dict(self):
        return {
            "id": self.id,
            "order_id": self.order_id,
            "previous_status": self.previous_status,
            "new_status": self.new_status,
            "changed_by": self.changed_by.username if self.changed_by else None,
            "changed_at": self.changed_at.isoformat(),
            "reason": self.reason,
            "request_id": self.request_id,
        }
