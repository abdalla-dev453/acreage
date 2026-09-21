from datetime import datetime
from app import db


class Cooperative(db.Model):
    """Model for farmer cooperatives"""
    __tablename__ = 'cooperatives'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.Text, nullable=True)
    location = db.Column(db.String(255), nullable=True)
    county = db.Column(db.String(100), nullable=True)
    registration_number = db.Column(db.String(50), nullable=True, unique=True)
    contact_person = db.Column(db.String(100), nullable=True)
    contact_phone = db.Column(db.String(20), nullable=True)
    contact_email = db.Column(db.String(120), nullable=True)
    established_date = db.Column(db.Date, nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    bulk_orders = db.relationship('BulkOrder', backref='cooperative', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'location': self.location,
            'county': self.county,
            'registration_number': self.registration_number,
            'contact_person': self.contact_person,
            'contact_phone': self.contact_phone,
            'contact_email': self.contact_email,
            'established_date': self.established_date.isoformat() if self.established_date else None,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class BulkOrder(db.Model):
    """Model for cooperative bulk orders"""
    __tablename__ = 'bulk_orders'

    id = db.Column(db.Integer, primary_key=True)
    cooperative_id = db.Column(db.Integer, db.ForeignKey('cooperatives.id'), nullable=False, index=True)
    order_code = db.Column(db.String(20), nullable=False, unique=True)
    buyer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    status = db.Column(db.String(20), nullable=False, default='pending')  # 'pending', 'confirmed', 'processing', 'ready', 'delivered', 'cancelled'
    total_amount = db.Column(db.Float, nullable=False)
    payment_status = db.Column(db.String(20), nullable=False, default='unpaid')  # 'unpaid', 'paid', 'failed'
    delivery_address = db.Column(db.String(255), nullable=False)
    contact_phone = db.Column(db.String(20), nullable=False)
    special_instructions = db.Column(db.Text, nullable=True)
    target_delivery_date = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    buyer = db.relationship('User', backref='bulk_orders', lazy=True)
    items = db.relationship('BulkOrderItem', backref='bulk_order', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'cooperative_id': self.cooperative_id,
            'order_code': self.order_code,
            'buyer_id': self.buyer_id,
            'status': self.status,
            'total_amount': self.total_amount,
            'payment_status': self.payment_status,
            'delivery_address': self.delivery_address,
            'contact_phone': self.contact_phone,
            'special_instructions': self.special_instructions,
            'target_delivery_date': self.target_delivery_date.isoformat() if self.target_delivery_date else None,
            'items': [item.to_dict() for item in self.items],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class BulkOrderItem(db.Model):
    """Model for items within a bulk order"""
    __tablename__ = 'bulk_order_items'

    id = db.Column(db.Integer, primary_key=True)
    bulk_order_id = db.Column(db.Integer, db.ForeignKey('bulk_orders.id'), nullable=False, index=True)
    farmer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False, index=True)
    quantity = db.Column(db.Float, nullable=False)
    unit_price = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(20), nullable=False, default='pending')  # 'pending', 'confirmed', 'fulfilled'
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    farmer = db.relationship('User', backref='bulk_order_items', lazy=True)
    product = db.relationship('Product', backref='bulk_order_items', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'bulk_order_id': self.bulk_order_id,
            'farmer_id': self.farmer_id,
            'product_id': self.product_id,
            'quantity': self.quantity,
            'unit_price': self.unit_price,
            'unit': self.unit,
            'status': self.status,
            'product_name': self.product.title if self.product else None,
            'farmer_name': self.farmer.username if self.farmer else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }