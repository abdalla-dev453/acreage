from app import db
from app.utils.time import utcnow

class Product(db.Model):
    __tablename__ = 'products'

    id = db.Column(db.Integer, primary_key=True)
    farmer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(150), nullable=False)
    category = db.Column(db.String(50), nullable=False)  # Vegetables, Fruits, Grains, Livestock
    description = db.Column(db.Text, nullable=True)
    price_per_unit = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(20), nullable=False, default='kg')  # kg, ton, crate, piece
    stock_quantity = db.Column(db.Float, nullable=False, default=0.0)
    image_url = db.Column(db.String(255), nullable=True)
    is_available = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)


    # Relationships
    order_items = db.relationship('OrderItem', back_populates='product', lazy=True)
