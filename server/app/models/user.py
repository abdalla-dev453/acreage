from app import db
from werkzeug.security import generate_password_hash, check_password_hash
from app.utils.time import utcnow

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    # Werkzeug's current scrypt hashes can exceed 128 characters.
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(50), nullable=False, default='farmer')  # 'buyer', 'farmer' or 'admin'
    phone_number = db.Column(db.String(20), nullable=True)
    location = db.Column(db.String(255), nullable=True)
    avatar_url = db.Column(db.String(255), nullable=True)
    verification_status = db.Column(db.String(20), nullable=False, default='unverified')
    verification_badge = db.Column(db.String(50), nullable=True)
    sms_opt_in = db.Column(db.Boolean, nullable=False, default=False)
    sms_phone_verified = db.Column(db.Boolean, nullable=False, default=False)
    quality_score = db.Column(db.Float, nullable=True)
    preferences_json = db.Column(db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime, default=utcnow)
    email_verified = db.Column(db.Boolean, nullable=False, default=False)
    verification_token_hash = db.Column(db.String(64), nullable=True)
    verification_token_expires_at = db.Column(db.DateTime, nullable=True)
    reset_token_hash = db.Column(db.String(64), nullable=True)
    reset_token_expires_at = db.Column(db.DateTime, nullable=True)
    cooperative_id = db.Column(db.Integer, db.ForeignKey('cooperatives.id'), nullable=True)

    # relationships
    products = db.relationship('Product', backref='farmer', lazy=True)
    farm_orders = db.relationship('Order', foreign_keys='Order.farmer_id', back_populates='farmer', lazy=True)
    buyer_orders = db.relationship('Order', foreign_keys='Order.buyer_id', back_populates='buyer', lazy=True)
    farm_logs = db.relationship('FarmLog', backref='farmer', lazy=True)
    reviews_written = db.relationship('Review', foreign_keys='Review.reviewer_id', backref='author', lazy=True)
    verification_requests = db.relationship(
        'VerificationRequest', foreign_keys='VerificationRequest.user_id',
        back_populates='user', lazy=True
    )
    reviewed_verifications = db.relationship(
        'VerificationRequest', foreign_keys='VerificationRequest.reviewer_id',
        back_populates='reviewer', lazy=True
    )
    escrow_transactions_as_buyer = db.relationship(
        'EscrowTransaction', foreign_keys='EscrowTransaction.buyer_id', lazy=True
    )
    escrow_transactions_as_farmer = db.relationship(
        'EscrowTransaction', foreign_keys='EscrowTransaction.farmer_id', lazy=True
    )
    cooperative = db.relationship('Cooperative', backref='members')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)