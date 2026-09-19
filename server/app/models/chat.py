from app import db
from app.utils.time import utcnow

class ChatMessage(db.Model):
    __tablename__ = "chat_messages"

    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=utcnow)

    sender = db.relationship('User', foreign_keys=[sender_id], backref='sent_messages', lazy='joined')
    receiver = db.relationship('User', foreign_keys=[receiver_id], backref='received_messages', lazy='joined')
