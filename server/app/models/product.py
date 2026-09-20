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
    unit = db.Column(db.String(20), nullable=False, default='kg')  # kg, debe, gunia, bag, crate, piece
    unit_weight_kg = db.Column(db.Float, nullable=True)
    stock_quantity = db.Column(db.Float, nullable=False, default=0.0)
    reserved_quantity = db.Column(db.Float, nullable=False, default=0.0)
    image_url = db.Column(db.String(255), nullable=True)
    video_url = db.Column(db.String(512), nullable=True)
    video_duration_seconds = db.Column(db.Integer, nullable=True)
    is_available = db.Column(db.Boolean, default=True)
    is_premium = db.Column(db.Boolean, default=False)
    allows_group_buying = db.Column(db.Boolean, default=False)
    quality_score = db.Column(db.Float, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


    # Relationships
    order_items = db.relationship('OrderItem', back_populates='product', lazy=True)
    group_orders = db.relationship('GroupOrder', back_populates='product', lazy=True)
    harvest_plans = db.relationship('HarvestPlan', back_populates='product', lazy=True)
