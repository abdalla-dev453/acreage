from app import db
from app.utils.time import utcnow
import uuid

class Order(db.Model):
    __tablename__ = "orders"

    id = db.Column(db.Integer, primary_key=True)
    order_code = db.Column(db.String(30), unique=True, nullable=False)
    buyer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    farmer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(30), default='pending')  # pending, on delivery, delivered, cancelled
    payment_status = db.Column(db.String(20), default='unpaid')  # paid, unpaid, cash on delivery
    delivery_address = db.Column(db.String(255), nullable=False)
    contact_phone = db.Column(db.String(20), nullable=False)
    delivery_lat = db.Column(db.Float, nullable=True)
    delivery_lng = db.Column(db.Float, nullable=True)
    origin_location = db.Column(db.String(255), nullable=True)
    quality_status = db.Column(db.String(30), default='not_required')
    transport_quote_id = db.Column(db.Integer, db.ForeignKey('transport_quotes.id'), nullable=True)
    transport_cost = db.Column(db.Float, nullable=True)
    sms_command_id = db.Column(db.Integer, db.ForeignKey('sms_commands.id'), nullable=True)
    group_order_id = db.Column(db.Integer, db.ForeignKey('group_orders.id'), nullable=True)
    harvest_preorder_id = db.Column(db.Integer, db.ForeignKey('harvest_preorders.id'), nullable=True)
    price_snapshot_json = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    # Relationships with explicit foreign_keys to prevent ambiguity with User model.
    # back_populates must point at the matching collection on User (buyer_orders /
    # farm_orders) so both sides of each relationship stay in sync within a session.
    buyer = db.relationship('User', foreign_keys=[buyer_id], back_populates='buyer_orders')
    farmer = db.relationship('User', foreign_keys=[farmer_id], back_populates='farm_orders')
    items = db.relationship('OrderItem', backref='order', lazy=True, cascade="all, delete-orphan")
    transport_quote = db.relationship('TransportQuote', foreign_keys=[transport_quote_id], uselist=False)
    sms_command = db.relationship('SmsCommand', foreign_keys=[sms_command_id], uselist=False)
    group_order = db.relationship('GroupOrder', back_populates='orders', lazy=True)
    harvest_preorder = db.relationship('HarvestPreorder', foreign_keys=[harvest_preorder_id], uselist=False)

    def to_dict(self):
        return {
            "id": self.id,
            "order_code": self.order_code,
            "buyer_id": self.buyer_id,
            "farmer_id": self.farmer_id,
            "customer": self.buyer.username if self.buyer else "Unknown",
            "total_amount": self.total_amount,
            "status": self.status,
            "payment_status": self.payment_status,
            "delivery_address": self.delivery_address,
            "contact_phone": self.contact_phone,
            "delivery_lat": self.delivery_lat,
            "delivery_lng": self.delivery_lng,
            "origin_location": self.origin_location,
            "quality_status": self.quality_status,
            "transport_cost": self.transport_cost,
            "group_order_id": self.group_order_id,
            "harvest_preorder_id": self.harvest_preorder_id,
            "price_snapshot": self.price_snapshot_json,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "items": [item.to_dict() for item in self.items]
        }


class OrderItem(db.Model):
    __tablename__ = "order_items"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Float, nullable=False)
    unit_price = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(20), nullable=True)
    unit_weight_kg = db.Column(db.Float, nullable=True)
    line_total = db.Column(db.Float, nullable=True)

    product = db.relationship('Product', back_populates='order_items')

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "product_name": self.product.title if self.product else "Product",
            "quantity": self.quantity,
            "unit": self.unit,
            "unit_weight_kg": self.unit_weight_kg,
            "unit_price": self.unit_price,
            "subtotal": self.line_total if self.line_total is not None else self.quantity * self.unit_price
        }