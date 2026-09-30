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

    # ── Moderation ────────────────────────────────────────────────────────
    # Separate from is_available, which the farmer owns. A listing can be held
    # for review without the farmer being able to quietly un-hide it, and
    # publication requires 'approved' — 'flagged' withdraws a listing that was
    # already live.
    # 'draft' | 'pending' | 'approved' | 'rejected' | 'flagged'
    moderation_status = db.Column(db.String(20), nullable=False, default='approved')
    is_featured = db.Column(db.Boolean, nullable=False, default=False)
    moderation_note = db.Column(db.Text, nullable=True)
    moderated_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    moderated_at = db.Column(db.DateTime, nullable=True)
    view_count = db.Column(db.Integer, nullable=False, default=0)
    report_count = db.Column(db.Integer, nullable=False, default=0)

    moderated_by = db.relationship(
        'User', foreign_keys=[moderated_by_id],
        backref=db.backref('moderated_products', lazy=True), lazy=True)

    @property
    def is_published(self):
        """True when the listing may appear in the public marketplace.

        Requires the farmer's own switch AND a moderation state that permits
        publication. A flagged listing is a statement about trust, not about
        availability, which is why the two are not folded together.
        """
        return bool(self.is_available) and self.moderation_status in (
            'approved', 'pending')

    @property
    def is_visible_to_public(self):
        """Stricter than is_published: 'pending' is not yet cleared for sale."""
        return bool(self.is_available) and self.moderation_status == 'approved'
    created_at = db.Column(db.DateTime, default=utcnow)


    # Relationships
    order_items = db.relationship('OrderItem', back_populates='product', lazy=True)
    group_orders = db.relationship('GroupOrder', back_populates='product', lazy=True)
    harvest_plans = db.relationship('HarvestPlan', back_populates='product', lazy=True)
