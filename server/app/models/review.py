from app import db
from sqlalchemy import UniqueConstraint
from app.utils.time import utcnow


class Review(db.Model):
    __tablename__ = "reviews"

    id = db.Column(db.Integer, primary_key=True)
    reviewer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    farmer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=True)
    rating = db.Column(db.Integer, nullable=False)  # 1 to 5 stars
    quality_freshness = db.Column(db.Integer, nullable=True)
    quality_accuracy = db.Column(db.Integer, nullable=True)
    quality_packaging = db.Column(db.Integer, nullable=True)
    quality_delivery = db.Column(db.Integer, nullable=True)
    quality_communication = db.Column(db.Integer, nullable=True)
    quality_score = db.Column(db.Float, nullable=True)
    verified_purchase = db.Column(db.Boolean, nullable=False, default=False)
    comment = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.String(255), nullable=True)
    like_count = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=utcnow)

    reviewer = db.relationship('User', foreign_keys=[reviewer_id], overlaps="author, reviews_written")
    order = db.relationship('Order', backref='reviews', uselist=False)
    likes = db.relationship('ReviewLike', back_populates='review', cascade='all, delete-orphan', lazy='selectin')
    comments = db.relationship('ReviewComment', back_populates='review', cascade='all, delete-orphan', order_by='ReviewComment.created_at.asc()', lazy='selectin')
    evidence = db.relationship('ReviewEvidence', back_populates='review', cascade='all, delete-orphan', lazy='selectin')


class ReviewLike(db.Model):
    __tablename__ = "review_likes"

    id = db.Column(db.Integer, primary_key=True)
    review_id = db.Column(db.Integer, db.ForeignKey('reviews.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)

    __table_args__ = (UniqueConstraint('review_id', 'user_id', name='uq_review_like'),)

    review = db.relationship('Review', back_populates='likes')
    user = db.relationship('User')


class ReviewComment(db.Model):
    __tablename__ = "review_comments"

    id = db.Column(db.Integer, primary_key=True)
    review_id = db.Column(db.Integer, db.ForeignKey('reviews.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)

    review = db.relationship('Review', back_populates='comments')
    user = db.relationship('User')