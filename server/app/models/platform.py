"""Finance, trust & safety and platform configuration (phases 3-5)."""

from app import db
from app.utils.time import utcnow


# ── Phase 3: disputes ───────────────────────────────────────────────────

class Dispute(db.Model):
    """A contested escrow.

    resolution_amount is the farmer's share and is only meaningful when
    decision == 'split'. Leaving it nullable rather than defaulting to zero
    means the column can never quietly disagree with the decision it belongs to.
    """

    __tablename__ = 'disputes'

    id = db.Column(db.Integer, primary_key=True)
    escrow_transaction_id = db.Column(db.Integer,
                                      db.ForeignKey('escrow_transactions.id'), nullable=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=True)
    opened_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    against_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    reason = db.Column(db.String(255), nullable=False)
    details = db.Column(db.Text, nullable=True)

    # 'open' | 'awaiting_evidence' | 'resolved'
    status = db.Column(db.String(30), nullable=False, default='open')
    # 'refund_buyer' | 'release_farmer' | 'split' | 'no_action'
    decision = db.Column(db.String(30), nullable=True)
    resolution_amount = db.Column(db.Float, nullable=True)
    resolution_note = db.Column(db.Text, nullable=True)
    # Chat excerpts, photos and order facts, captured when the dispute is opened
    # so the evidence cannot be edited afterwards by either party.
    evidence_json = db.Column(db.JSON, nullable=True)

    resolved_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    resolved_at = db.Column(db.DateTime, nullable=True)
    opened_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    escrow = db.relationship('EscrowTransaction', lazy=True)
    opened_by = db.relationship('User', foreign_keys=[opened_by_id], lazy=True)
    against_user = db.relationship('User', foreign_keys=[against_user_id], lazy=True)
    resolved_by = db.relationship('User', foreign_keys=[resolved_by_id], lazy=True)

    @property
    def is_open(self):
        return self.status != 'resolved'

    def to_dict(self, order_code=None, escrow_status=None, escrow_amount=None):
        return {
            'id': self.id,
            'escrow_transaction_id': self.escrow_transaction_id,
            'order_id': self.order_id,
            'order_code': order_code,
            'escrow_status': escrow_status,
            'escrow_amount': escrow_amount,
            'opened_by': self.opened_by.username if self.opened_by else None,
            'against_user': self.against_user.username if self.against_user else None,
            'reason': self.reason,
            'details': self.details,
            'status': self.status,
            'decision': self.decision,
            'resolution_amount': self.resolution_amount,
            'resolution_note': self.resolution_note,
            'evidence': self.evidence_json,
            'resolved_by': self.resolved_by.username if self.resolved_by else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'opened_at': self.opened_at.isoformat() if self.opened_at else None,
        }


# ── Phase 5: platform settings and content ──────────────────────────────

class PlatformSetting(db.Model):
    """Key/value configuration with JSON values.

    is_secret is separate from is_public because they answer different
    questions: may the storefront read it, and must the admin API ever return
    it. A secret that is also public is contradictory, and the write path
    refuses that combination.
    """

    __tablename__ = 'platform_settings'

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(80), unique=True, nullable=False)
    value_json = db.Column(db.JSON, nullable=True)
    # 'general' | 'finance' | 'features' | 'contact' | 'legal'
    category = db.Column(db.String(40), nullable=False, default='general')
    description = db.Column(db.String(255), nullable=True)
    is_public = db.Column(db.Boolean, nullable=False, default=False)
    is_secret = db.Column(db.Boolean, nullable=False, default=False)
    updated_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    updated_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    updated_by = db.relationship('User', foreign_keys=[updated_by_id], lazy=True)

    def to_dict(self, reveal=False):
        value = self.value_json
        # A secret never leaves through this serializer, whatever the caller.
        if self.is_secret and not reveal:
            value = None
        return {
            'key': self.key,
            'value': value,
            'category': self.category,
            'description': self.description,
            'is_public': self.is_public,
            'is_secret': self.is_secret,
            'is_set': self.value_json is not None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'updated_by': self.updated_by.username if self.updated_by else None,
        }


class ContentPage(db.Model):
    """Editable legal and marketing copy, so changing a policy is an admin
    action rather than a code change and redeploy."""

    __tablename__ = 'content_pages'

    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(60), unique=True, nullable=False)
    title = db.Column(db.String(160), nullable=False)
    body = db.Column(db.Text, nullable=False)
    summary = db.Column(db.String(255), nullable=True)
    is_published = db.Column(db.Boolean, nullable=False, default=False)
    updated_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    updated_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    updated_by = db.relationship('User', foreign_keys=[updated_by_id], lazy=True)

    def to_dict(self, include_body=True):
        return {
            'id': self.id,
            'slug': self.slug,
            'title': self.title,
            'summary': self.summary,
            'is_published': self.is_published,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'updated_by': self.updated_by.username if self.updated_by else None,
            **({'body': self.body} if include_body else {}),
        }


# ── Phase 4: campaigns ──────────────────────────────────────────────────

class Announcement(db.Model):
    """An outbound campaign with segment targeting."""

    __tablename__ = 'announcements'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(160), nullable=False)
    body = db.Column(db.Text, nullable=False)
    # 'in_app' | 'sms' | 'email'
    channel = db.Column(db.String(20), nullable=False, default='in_app')
    # {"roles": ["farmer"], "location": "Nakuru", "unverified_only": true}
    segment_json = db.Column(db.JSON, nullable=True)
    # 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled'
    status = db.Column(db.String(20), nullable=False, default='draft')
    scheduled_at = db.Column(db.DateTime, nullable=True)
    sent_at = db.Column(db.DateTime, nullable=True)
    recipient_count = db.Column(db.Integer, nullable=False, default=0)
    delivered_count = db.Column(db.Integer, nullable=False, default=0)
    failed_count = db.Column(db.Integer, nullable=False, default=0)
    created_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    created_by = db.relationship('User', foreign_keys=[created_by_id], lazy=True)
    deliveries = db.relationship(
        'NotificationDelivery', backref=db.backref('announcement', lazy=True),
        lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'body': self.body,
            'channel': self.channel,
            'segment': self.segment_json,
            'status': self.status,
            'scheduled_at': self.scheduled_at.isoformat() if self.scheduled_at else None,
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
            'recipient_count': self.recipient_count,
            'delivered_count': self.delivered_count,
            'failed_count': self.failed_count,
            'created_by': self.created_by.username if self.created_by else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class NotificationDelivery(db.Model):
    """Per-recipient outcome, so a campaign reports real delivery rather than a
    single success flag on the campaign row."""

    __tablename__ = 'notification_deliveries'

    id = db.Column(db.Integer, primary_key=True)
    announcement_id = db.Column(db.Integer,
                                db.ForeignKey('announcements.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    phone_number = db.Column(db.String(20), nullable=True)
    # 'queued' | 'sent' | 'delivered' | 'failed'
    status = db.Column(db.String(20), nullable=False, default='queued')
    error_message = db.Column(db.String(255), nullable=True)
    cost = db.Column(db.Float, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    user = db.relationship('User', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'announcement_id': self.announcement_id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'phone_number': self.phone_number,
            'status': self.status,
            'error_message': self.error_message,
            'cost': self.cost,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


# ── Phase 4: chat moderation ────────────────────────────────────────────

class ModerationKeyword(db.Model):
    """The scam and abuse word list.

    Matching is case-insensitive substring, not a word boundary: scam phrases
    are written to dodge word boundaries ("telegram me", "paypal instead"), so
    a boundary match would miss exactly the traffic this is for.
    """

    __tablename__ = 'moderation_keywords'

    id = db.Column(db.Integer, primary_key=True)
    phrase = db.Column(db.String(120), nullable=False)
    # 'scam' | 'abuse' | 'off_platform' | 'spam'
    category = db.Column(db.String(30), nullable=False, default='scam')
    # 'low' | 'medium' | 'high'
    severity = db.Column(db.String(20), nullable=False, default='medium')
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    hit_count = db.Column(db.Integer, nullable=False, default=0)
    created_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    created_by = db.relationship('User', foreign_keys=[created_by_id], lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'phrase': self.phrase,
            'category': self.category,
            'severity': self.severity,
            'is_active': self.is_active,
            'hits': self.hit_count,
            'created_by': self.created_by.username if self.created_by else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class UserMute(db.Model):
    """Blocks a user from messaging without deleting their history.

    Separate from account_status: muting stops one conversation channel while
    the account stays usable for orders.
    """

    __tablename__ = 'user_mutes'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    reason = db.Column(db.String(255), nullable=True)
    created_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    expires_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    user = db.relationship('User', foreign_keys=[user_id],
                           backref='mutes', lazy=True)
    created_by = db.relationship('User', foreign_keys=[created_by_id], lazy=True)

    @property
    def is_active(self):
        return self.expires_at is None or self.expires_at > utcnow()

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'reason': self.reason,
            'is_active': self.is_active,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'created_by': self.created_by.username if self.created_by else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


# ── Phase 5: support ────────────────────────────────────────────────────

class SupportTicket(db.Model):
    __tablename__ = 'support_tickets'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    subject = db.Column(db.String(160), nullable=False)
    body = db.Column(db.Text, nullable=False)
    # 'low' | 'normal' | 'high' | 'urgent'
    priority = db.Column(db.String(20), nullable=False, default='normal')
    # 'open' | 'pending' | 'resolved' | 'closed'
    status = db.Column(db.String(20), nullable=False, default='open')
    assigned_to_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    resolution_note = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    user = db.relationship('User', foreign_keys=[user_id],
                           backref='tickets', lazy=True)
    assigned_to = db.relationship('User', foreign_keys=[assigned_to_id], lazy=True)
    messages = db.relationship(
        'SupportMessage', backref=db.backref('ticket', lazy=True),
        lazy='selectin', order_by='SupportMessage.created_at')

    def to_dict(self, include_messages=False):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'subject': self.subject,
            'body': self.body,
            'priority': self.priority,
            'status': self.status,
            'assigned_to': self.assigned_to.username if self.assigned_to else None,
            'resolution_note': self.resolution_note,
            'message_count': len(self.messages or []),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            **({'messages': [m.to_dict() for m in (self.messages or [])]}
               if include_messages else {}),
        }


class SupportMessage(db.Model):
    __tablename__ = 'support_messages'

    id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey('support_tickets.id'),
                          nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    body = db.Column(db.Text, nullable=False)
    is_staff = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    author = db.relationship('User', foreign_keys=[author_id], lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'ticket_id': self.ticket_id,
            'author': self.author.username if self.author else None,
            'body': self.body,
            'is_staff': self.is_staff,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }