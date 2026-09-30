"""Marketplace moderation: categories, flags and reports.

Separate from the escrow and dispute models because these describe *content and
trust*, not money. A flag is an internal marker on an account or listing; a
report is something a user submitted. They are deliberately distinct tables so
"an admin noticed something" is never confused with "a user complained", and so
clearing a report does not silently clear an admin's flag.
"""

from app import db
from app.utils.time import utcnow


class ProductCategory(db.Model):
    """An admin-managed category.

    Product.category is a free-text string, so without this table the set of
    categories drifts into typos and near-duplicates that no filter can group.
    The slug here is the value listings should carry.
    """

    __tablename__ = 'product_categories'

    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(60), unique=True, nullable=False)
    name = db.Column(db.String(60), nullable=False)
    description = db.Column(db.String(255), nullable=True)
    # Pre-fills the unit on a new listing, since every category sells in
    # something specific: vegetables in kg, eggs in crates, flowers in bunches.
    default_unit = db.Column(db.String(20), nullable=True)
    icon = db.Column(db.String(40), nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    sort_order = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    def to_dict(self, product_count=None):
        return {
            'id': self.id,
            'slug': self.slug,
            'name': self.name,
            'description': self.description,
            'default_unit': self.default_unit,
            'icon': self.icon,
            'is_active': self.is_active,
            'sort_order': self.sort_order,
            'product_count': product_count,
        }


class UserFlag(db.Model):
    """An internal marker on an account: something an admin wants to see.

    Distinct from account_status: a flag records a concern and does not by
    itself restrict anything, so raising one is cheap and reversible. Freezing
    is the action with teeth.
    """

    __tablename__ = 'user_flags'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    # 'fraud', 'quality', 'conduct', 'spam', 'verification', 'other'
    category = db.Column(db.String(40), nullable=False)
    reason = db.Column(db.String(255), nullable=False)
    # 'low' | 'medium' | 'high'
    severity = db.Column(db.String(20), nullable=False, default='medium')

    raised_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    cleared_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    cleared_at = db.Column(db.DateTime, nullable=True)
    cleared_reason = db.Column(db.String(255), nullable=True)

    user = db.relationship(
        'User', foreign_keys=[user_id], backref='flags', lazy=True)
    raised_by = db.relationship('User', foreign_keys=[raised_by_id], lazy=True)

    @property
    def is_open(self):
        return self.cleared_at is None

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'category': self.category,
            'reason': self.reason,
            'severity': self.severity,
            'is_open': self.is_open,
            'raised_by': self.raised_by.username if self.raised_by else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'cleared_by_id': self.cleared_by_id,
            'cleared_at': self.cleared_at.isoformat() if self.cleared_at else None,
            'cleared_reason': self.cleared_reason,
        }


class ContentReport(db.Model):
    """Something a user reported about a listing, account, review or message.

    Kept as its own table with its own resolution lifecycle so that closing a
    report is an explicit decision with a note, not a side effect of deleting
    the underlying content.
    """

    __tablename__ = 'content_reports'

    id = db.Column(db.Integer, primary_key=True)
    # 'product' | 'user' | 'review' | 'chat_message'
    target_type = db.Column(db.String(20), nullable=False)
    target_id = db.Column(db.Integer, nullable=False)
    reason = db.Column(db.String(255), nullable=False)
    # 'fraud' | 'misleading' | 'abuse' | 'spam' | 'off_platform_payment' | 'other'
    category = db.Column(db.String(40), nullable=False, default='other')
    details = db.Column(db.Text, nullable=True)

    # 'open' | 'actioned' | 'dismissed'
    status = db.Column(db.String(20), nullable=False, default='open')

    reporter_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    resolved_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    resolved_at = db.Column(db.DateTime, nullable=True)
    resolution_note = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    reporter = db.relationship('User', foreign_keys=[reporter_user_id], lazy=True)
    resolved_by = db.relationship('User', foreign_keys=[resolved_by_id], lazy=True)

    def to_dict(self, target_label=None):
        return {
            'id': self.id,
            'target_type': self.target_type,
            'target_id': self.target_id,
            'target_label': target_label,
            'reason': self.reason,
            'category': self.category,
            'details': self.details,
            'status': self.status,
            'reporter': self.reporter.username if self.reporter else None,
            'resolved_by': self.resolved_by.username if self.resolved_by else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'resolution_note': self.resolution_note,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }