import os
import re
from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from werkzeug.utils import secure_filename

from sqlalchemy import func

from app import db
from app.models.product import Product
from app.models.review import Review
from app.models.trust import MediaAsset, ReviewEvidence, VerificationRequest
from app.models.user import User
from app.schemas.trust import (
    media_asset_schema,
    media_assets_schema,
    review_evidence_schema,
    review_evidence_items_schema,
    verification_request_schema,
    verification_requests_schema,
)
from app.utils.http import json_object

trust_bp = Blueprint('trust', __name__)

ALLOWED_MEDIA = {'png', 'jpg', 'jpeg', 'webp', 'mp4', 'mov', 'webm'}
ALLOWED_IMAGES = {'png', 'jpg', 'jpeg', 'webp'}
ALLOWED_REQUEST_TYPES = {'identity', 'farm', 'photo', 'video'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_MEDIA


def _extension(filename):
    return filename.rsplit('.', 1)[1].lower() if '.' in filename else ''


def _save_media(file, owner_type, owner_id, kind, uploaded_by_id):
    if not file or not file.filename:
        return None, (jsonify({'message': 'A media file is required'}), 400)
    if not allowed_file(file.filename):
        return None, (jsonify({'message': 'Unsupported media type'}), 400)
    extension = _extension(file.filename)
    if kind == 'photo' and extension not in ALLOWED_IMAGES:
        return None, (jsonify({'message': 'Photo evidence must be an image'}), 400)
    if kind == 'video' and extension not in {'mp4', 'mov', 'webm'}:
        return None, (jsonify({'message': 'Video evidence must be mp4, mov, or webm'}), 400)
    folder = os.path.join(current_app.root_path, 'static', 'uploads', 'trust')
    os.makedirs(folder, exist_ok=True)
    filename = secure_filename(f'{kind}_{uploaded_by_id}_{file.filename}')
    path = os.path.join(folder, filename)
    file.save(path)
    media = MediaAsset(
        owner_type=owner_type,
        owner_id=owner_id,
        kind=kind,
        url=f'/static/uploads/trust/{filename}',
        mime_type=file.mimetype or ('video/mp4' if kind == 'video' else 'image/jpeg'),
        size_bytes=os.path.getsize(path),
        uploaded_by_id=uploaded_by_id,
    )
    db.session.add(media)
    db.session.flush()
    return media, None


@trust_bp.route('/me', methods=['GET'])
@jwt_required()
def trust_me():
    user = db.get_or_404(User, int(get_jwt_identity()))
    requests = VerificationRequest.query.filter_by(user_id=user.id).order_by(
        VerificationRequest.submitted_at.desc()
    ).all()
    return jsonify({
        'verification_status': user.verification_status,
        'verification_badge': user.verification_badge,
        'requests': verification_requests_schema.dump(requests),
    }), 200


@trust_bp.route('/media', methods=['POST'])
@jwt_required()
def upload_media():
    user_id = int(get_jwt_identity())
    owner_type = (request.form.get('owner_type') or '').strip().lower()
    owner_id = request.form.get('owner_id')
    kind = (request.form.get('kind') or 'photo').strip().lower()
    if owner_type not in {'user', 'product', 'review'}:
        return jsonify({'message': 'owner_type must be user, product, or review'}), 400
    if kind not in {'photo', 'video', 'document'}:
        return jsonify({'message': 'kind must be photo, video, or document'}), 400
    if not owner_id:
        return jsonify({'message': 'owner_id is required'}), 400
    try:
        owner_id = int(owner_id)
    except ValueError:
        return jsonify({'message': 'owner_id must be an integer'}), 400
    if owner_type == 'user' and owner_id != user_id:
        return jsonify({'message': 'Unauthorized media owner'}), 403
    if owner_type == 'product':
        product = db.session.get(Product, owner_id)
        if not product or product.farmer_id != user_id:
            return jsonify({'message': 'Unauthorized media owner'}), 403
    if owner_type == 'review':
        review = db.session.get(Review, owner_id)
        if not review or review.reviewer_id != user_id:
            return jsonify({'message': 'Unauthorized media owner'}), 403
    media, error = _save_media(request.files.get('file'), owner_type, owner_id, kind, user_id)
    if error:
        return error
    db.session.commit()
    return media_asset_schema.jsonify(media), 201


@trust_bp.route('/media', methods=['GET'])
@jwt_required()
def list_media():
    user_id = int(get_jwt_identity())
    user = db.get_or_404(User, user_id)
    query = MediaAsset.query
    if user.role != 'admin':
        query = query.filter_by(uploaded_by_id=user_id)
    else:
        query = query.filter(MediaAsset.owner_type != 'review')
    owner_type = request.args.get('owner_type')
    owner_id = request.args.get('owner_id')
    if owner_type:
        query = query.filter_by(owner_type=owner_type.lower())
    if owner_id:
        try:
            query = query.filter_by(owner_id=int(owner_id))
        except ValueError:
            return jsonify({'message': 'owner_id must be an integer'}), 400
    items = query.order_by(MediaAsset.created_at.desc()).all()
    return jsonify({'items': media_assets_schema.dump(items), 'total': len(items)}), 200


@trust_bp.route('/verification-requests', methods=['GET'])
@jwt_required()
def list_verification_requests():
    user_id = int(get_jwt_identity())
    user = db.get_or_404(User, user_id)
    query = VerificationRequest.query
    if user.role != 'admin':
        query = query.filter_by(user_id=user_id)
    items = query.order_by(VerificationRequest.submitted_at.desc()).all()
    return jsonify({'items': verification_requests_schema.dump(items), 'total': len(items)}), 200


@trust_bp.route('/verification-requests', methods=['POST'])
@jwt_required()
def create_verification_request():
    user_id = int(get_jwt_identity())
    data, error = json_object()
    if error:
        return error
    request_type = str(data.get('request_type', '')).strip().lower()
    if request_type not in ALLOWED_REQUEST_TYPES:
        return jsonify({'message': 'Unsupported verification request type'}), 400
    evidence_media_id = data.get('evidence_media_id')
    evidence = None
    if evidence_media_id:
        try:
            evidence = db.session.get(MediaAsset, int(evidence_media_id))
        except (TypeError, ValueError):
            return jsonify({'message': 'evidence_media_id must be an integer'}), 400
        if not evidence or evidence.uploaded_by_id != user_id:
            return jsonify({'message': 'Evidence media not found'}), 404
    last4 = data.get('id_number_last4')
    if last4 is not None and not re.fullmatch(r'\d{4}', str(last4)):
        return jsonify({'message': 'id_number_last4 must contain four digits'}), 400
    verification = VerificationRequest(
        user_id=user_id,
        request_type=request_type,
        status='pending',
        id_number_last4=str(last4) if last4 is not None else None,
        farm_location=(data.get('farm_location') or '').strip() or None,
        evidence=evidence,
        metadata_json=data.get('metadata') if isinstance(data.get('metadata'), dict) else {},
    )
    db.session.add(verification)
    db.session.commit()
    return verification_request_schema.jsonify(verification), 201


@trust_bp.route('/verification-requests/<int:request_id>', methods=['GET'])
@jwt_required()
def get_verification_request(request_id):
    user = db.get_or_404(User, int(get_jwt_identity()))
    item = db.get_or_404(VerificationRequest, request_id)
    if user.role != 'admin' and item.user_id != user.id:
        return jsonify({'message': 'Unauthorized'}), 403
    return verification_request_schema.jsonify(item), 200


@trust_bp.route('/verification-requests/<int:request_id>/review', methods=['POST'])
@jwt_required()
def review_verification(request_id):
    user = db.get_or_404(User, int(get_jwt_identity()))
    if user.role != 'admin':
        return jsonify({'message': 'Admin access required'}), 403
    item = db.get_or_404(VerificationRequest, request_id)
    data, error = json_object()
    if error:
        return error
    status = str(data.get('status', '')).strip().lower()
    if status not in {'approved', 'rejected'}:
        return jsonify({'message': 'status must be approved or rejected'}), 400
    item.status = status
    item.reviewer_id = user.id
    item.rejection_reason = (data.get('rejection_reason') or '').strip() or None
    item.reviewed_at = func.now()
    item.metadata_json = {**(item.metadata_json or {}), 'reviewer_id': user.id}
    applicant = db.get_or_404(User, item.user_id)
    if status == 'approved':
        applicant.verification_status = 'verified'
        applicant.verification_badge = data.get('verification_badge') or 'verified-farmer'
    else:
        applicant.verification_status = 'rejected'
        applicant.verification_badge = None
    db.session.commit()
    return verification_request_schema.jsonify(item), 200


@trust_bp.route('/reviews/<int:review_id>/evidence', methods=['POST'])
@jwt_required()
def add_review_evidence(review_id):
    user_id = int(get_jwt_identity())
    review = db.get_or_404(Review, review_id)
    if review.reviewer_id != user_id:
        return jsonify({'message': 'Only the review author can attach evidence'}), 403
    kind = (request.form.get('kind') or 'photo').lower()
    media, error = _save_media(request.files.get('file'), 'review', review.id, kind, user_id)
    if error:
        return error
    evidence = ReviewEvidence(review=review, media=media, kind=kind)
    db.session.add(evidence)
    db.session.commit()
    return review_evidence_schema.jsonify(evidence), 201


@trust_bp.route('/reviews/<int:review_id>/evidence', methods=['GET'])
@jwt_required()
def get_review_evidence(review_id):
    db.get_or_404(Review, review_id)
    items = ReviewEvidence.query.filter_by(review_id=review_id).all()
    return jsonify({'items': review_evidence_items_schema.dump(items), 'total': len(items)}), 200
