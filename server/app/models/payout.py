from app import db
from datetime import datetime


class Payout(db.Model):
    __tablename__ = "payouts"


    id = db.Column(db.Integer, primary_key=True)
    farmer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    mpesa_number = db.Column(db.String(20), nullable=False)
    conversation_id = db.Column(db.String(50), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='Pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


    farmer = db.relationship('User', backref='payouts', lazy=True)