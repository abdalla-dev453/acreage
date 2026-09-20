from app import ma
from marshmallow import fields
from app.models.trust import MediaAsset, VerificationRequest, ReviewEvidence


class MediaAssetSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = MediaAsset
        include_fk = True
        fields = (
            'id', 'owner_type', 'owner_id', 'kind', 'url', 'mime_type', 'size_bytes',
            'duration_seconds', 'checksum', 'status', 'uploaded_by_id', 'created_at',
        )
        dump_only = ('id', 'created_at')


class ReviewEvidenceSchema(ma.SQLAlchemyAutoSchema):
    media = ma.Nested(MediaAssetSchema, dump_only=True)

    class Meta:
        model = ReviewEvidence
        include_fk = True
        fields = ('id', 'review_id', 'kind', 'media', 'created_at')
        dump_only = ('id', 'created_at', 'media')


class VerificationRequestSchema(ma.SQLAlchemyAutoSchema):
    metadata = fields.Raw(attribute='metadata_json')
    evidence = ma.Nested(MediaAssetSchema, dump_only=True)

    class Meta:
        model = VerificationRequest
        include_fk = True
        fields = (
            'id', 'user_id', 'request_type', 'status', 'id_number_last4', 'farm_location',
            'evidence_media_id', 'evidence', 'rejection_reason', 'metadata', 'submitted_at', 'reviewed_at',
        )
        dump_only = ('id', 'evidence', 'submitted_at', 'reviewed_at')


media_asset_schema = MediaAssetSchema()
media_assets_schema = MediaAssetSchema(many=True)
review_evidence_schema = ReviewEvidenceSchema()
review_evidence_items_schema = ReviewEvidenceSchema(many=True)
verification_request_schema = VerificationRequestSchema()
verification_requests_schema = VerificationRequestSchema(many=True)
