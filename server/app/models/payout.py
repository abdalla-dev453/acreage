from app import db
from app.utils.time import utcnow


class Payout(db.Model):
    __tablename__ = "payouts"


    id = db.Column(db.Integer, primary_key=True)
    farmer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    mpesa_number = db.Column(db.String(20), nullable=False)
    conversation_id = db.Column(db.String(50), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='Pending')
    escrow_transaction_id = db.Column(db.Integer, db.ForeignKey('escrow_transactions.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


    farmer = db.relationship('User', backref='payouts', lazy=True)
    escrow_transaction = db.relationship('EscrowTransaction', back_populates='payout', uselist=False)
