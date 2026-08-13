from app import db
from app.utils.time import utcnow


class Review(db.Model):
    __tablename__ = "reviews"


    id = db.Column(db.Integer, primary_key=True)
    reviewer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    farmer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    rating = db.Column(db.Integer, nullable=False)  # 1 to 5 stars
    comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    image_url = db.Column(db.String(255), nullable=True)


    reviewer = db.relationship('User', foreign_keys=[reviewer_id])