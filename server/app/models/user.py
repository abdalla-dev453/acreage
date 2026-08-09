from app import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(50), nullable=False, default='farmer')  # 'buyer' or 'admin'
    location = db.Column(db.String(255), nullable=True)
    avatar_url = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


    # relationships
    products = db.relationship('Product', backref='farmer', lazy=True)
    farm_orders = db.relationship('Order', foreign_keys='Order.farmer_id', backref='farmer', lazy=True)
    buyer_orders = db.relationship('Order', foreign_keys='Order.buyer_id', backref='buyer', lazy=True)
    farm_logs = db.relationship('FarmLog', backref='farmer', lazy=True)
    reviews_written = db.relationship('Review', foreign_keys='Review.reviewer_id', backref='reviewer', lazy=True)


    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
