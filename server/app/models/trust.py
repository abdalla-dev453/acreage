from app import db
from app.utils.time import utcnow


class MediaAsset(db.Model):
    __tablename__ = 'media_assets'

    id = db.Column(db.Integer, primary_key=True)
    owner_type = db.Column(db.String(40), nullable=False)
    owner_id = db.Column(db.Integer, nullable=False)
    kind = db.Column(db.String(20), nullable=False)
    url = db.Column(db.String(512), nullable=False)
    mime_type = db.Column(db.String(100), nullable=False)
    size_bytes = db.Column(db.Integer, nullable=False, default=0)
    duration_seconds = db.Column(db.Integer, nullable=True)
    checksum = db.Column(db.String(64), nullable=True)
    status = db.Column(db.String(20), nullable=False, default='active')
    uploaded_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)

    uploaded_by = db.relationship('User', backref='uploaded_media', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'owner_type': self.owner_type,
            'owner_id': self.owner_id,
            'kind': self.kind,
            'url': self.url,
            'mime_type': self.mime_type,
            'size_bytes': self.size_bytes,
            'duration_seconds': self.duration_seconds,
            'checksum': self.checksum,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class VerificationRequest(db.Model):
    __tablename__ = 'verification_requests'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    request_type = db.Column(db.String(30), nullable=False)
    status = db.Column(db.String(20), nullable=False, default='pending')
    id_number_last4 = db.Column(db.String(4), nullable=True)
    id_number_hash = db.Column(db.String(64), nullable=True)
    farm_location = db.Column(db.String(255), nullable=True)
    county = db.Column(db.String(100), nullable=True)
    farm_size_acres = db.Column(db.Float, nullable=True)
    cooperative_name = db.Column(db.String(100), nullable=True)
    evidence_media_id = db.Column(db.Integer, db.ForeignKey('media_assets.id'), nullable=True)
    reviewer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    rejection_reason = db.Column(db.Text, nullable=True)
    metadata_json = db.Column(db.JSON, nullable=False, default=dict)
    submitted_at = db.Column(db.DateTime, default=utcnow)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    user = db.relationship('User', foreign_keys=[user_id], back_populates='verification_requests', lazy=True)
    evidence = db.relationship('MediaAsset', backref='verification_request', uselist=False)
    reviewer = db.relationship('User', foreign_keys=[reviewer_id], back_populates='reviewed_verifications', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'request_type': self.request_type,
            'status': self.status,
            'id_number_last4': self.id_number_last4,
            'farm_location': self.farm_location,
            'county': self.county,
            'farm_size_acres': self.farm_size_acres,
            'cooperative_name': self.cooperative_name,
            'evidence': self.evidence.to_dict() if self.evidence else None,
            'rejection_reason': self.rejection_reason,
            'metadata': self.metadata_json or {},
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
        }


class ReviewEvidence(db.Model):
    __tablename__ = 'review_evidence'

    id = db.Column(db.Integer, primary_key=True)
    review_id = db.Column(db.Integer, db.ForeignKey('reviews.id'), nullable=False)
    media_id = db.Column(db.Integer, db.ForeignKey('media_assets.id'), nullable=False)
    kind = db.Column(db.String(20), nullable=False, default='photo')
    created_at = db.Column(db.DateTime, default=utcnow)

    review = db.relationship('Review', back_populates='evidence')
    media = db.relationship('MediaAsset', backref='review_evidence', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'review_id': self.review_id,
            'kind': self.kind,
            'media': self.media.to_dict() if self.media else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class PhoneVerification(db.Model):
    __tablename__ = 'phone_verifications'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    phone_number = db.Column(db.String(20), nullable=False)
    code = db.Column(db.String(6), nullable=False)
    attempts = db.Column(db.Integer, default=0)
    verified_at = db.Column(db.DateTime, nullable=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)

    user = db.relationship('User', backref='phone_verifications')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'phone_number': self.phone_number,
            'verified_at': self.verified_at.isoformat() if self.verified_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class TrustBadge(db.Model):
    __tablename__ = 'trust_badges'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    phone_verified = db.Column(db.Boolean, default=False)
    county_verified = db.Column(db.Boolean, default=False)
    farm_verified = db.Column(db.Boolean, default=False)
    cooperative_verified = db.Column(db.Boolean, default=False)
    verified_farmer = db.Column(db.Boolean, default=False)
    verified_buyer = db.Column(db.Boolean, default=False)
    badge_tier = db.Column(db.String(20), default='none')  # none, bronze, silver, gold
    reliability_score = db.Column(db.Float, default=0.0)
    total_transactions = db.Column(db.Integer, default=0)
    successful_transactions = db.Column(db.Integer, default=0)
    disputed_transactions = db.Column(db.Integer, default=0)
    last_updated = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)
    created_at = db.Column(db.DateTime, default=utcnow)

    user = db.relationship('User', backref='trust_badge', uselist=False)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'phone_verified': self.phone_verified,
            'county_verified': self.county_verified,
            'farm_verified': self.farm_verified,
            'cooperative_verified': self.cooperative_verified,
            'verified_farmer': self.verified_farmer,
            'verified_buyer': self.verified_buyer,
            'badge_tier': self.badge_tier,
            'reliability_score': self.reliability_score,
            'total_transactions': self.total_transactions,
            'successful_transactions': self.successful_transactions,
            'disputed_transactions': self.disputed_transactions,
            'last_updated': self.last_updated.isoformat() if self.last_updated else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class UserBlock(db.Model):
    __tablename__ = 'user_blocks'

    id = db.Column(db.Integer, primary_key=True)
    blocker_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    blocked_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    reason = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    blocker = db.relationship('User', foreign_keys=[blocker_id], backref='blocks_made')
    blocked = db.relationship('User', foreign_keys=[blocked_id], backref='blocks_received')

    __table_args__ = (db.UniqueConstraint('blocker_id', 'blocked_id', name='uq_blocker_blocked'),)

    def to_dict(self):
        return {
            'id': self.id,
            'blocker_id': self.blocker_id,
            'blocked_id': self.blocked_id,
            'reason': self.reason,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Report(db.Model):
    __tablename__ = 'reports'

    id = db.Column(db.Integer, primary_key=True)
    reporter_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    reported_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    target_type = db.Column(db.String(30), nullable=False)  # user, product, review, order
    target_id = db.Column(db.Integer, nullable=False)
    reason = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default='pending')  # pending, reviewed, actioned, dismissed
    reviewed_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    action_taken = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    reporter = db.relationship('User', foreign_keys=[reporter_id], backref='reports_made')
    reported_user = db.relationship('User', foreign_keys=[reported_user_id], backref='reports_received')
    reviewer = db.relationship('User', foreign_keys=[reviewed_by_id], backref='reports_reviewed')

    def to_dict(self):
        return {
            'id': self.id,
            'reporter_id': self.reporter_id,
            'reported_user_id': self.reported_user_id,
            'target_type': self.target_type,
            'target_id': self.target_id,
            'reason': self.reason,
            'description': self.description,
            'status': self.status,
            'action_taken': self.action_taken,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # order_created, order_status, payment, review, dispute, message, verification, alert
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=True)
    data_json = db.Column(db.JSON, nullable=True)
    is_read = db.Column(db.Boolean, default=False)
    read_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    user = db.relationship('User', backref='notifications')

    def to_dict(self):
        return {
            'id': self.id,
            'type': self.type,
            'title': self.title,
            'message': self.message,
            'data': self.data_json,
            'is_read': self.is_read,
            'read_at': self.read_at.isoformat() if self.read_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class SuspiciousAccount(db.Model):
    __tablename__ = 'suspicious_accounts'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    detection_type = db.Column(db.String(50), nullable=False)  # duplicate_phone, duplicate_email, duplicate_ip, unusual_activity
    details = db.Column(db.JSON, nullable=True)
    severity = db.Column(db.String(20), default='medium')  # low, medium, high, critical
    status = db.Column(db.String(20), default='detected')  # detected, reviewing, cleared, actioned
    reviewed_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    user = db.relationship('User', foreign_keys=[user_id], backref='suspicious_accounts')
    reviewer = db.relationship('User', foreign_keys=[reviewed_by_id], backref='suspicious_reviews')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'detection_type': self.detection_type,
            'details': self.details,
            'severity': self.severity,
            'status': self.status,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
