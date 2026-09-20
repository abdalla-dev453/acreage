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
