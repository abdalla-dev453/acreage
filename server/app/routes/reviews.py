import os
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
from sqlalchemy.orm import selectinload

from app import db
from app.models.review import Review, ReviewLike, ReviewComment
from app.models.user import User
from app.models.order import Order
from app.schemas.review import review_schema, reviews_schema, review_comment_schema, review_comments_schema

reviews_bp = Blueprint('reviews', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@reviews_bp.route('/', methods=['GET'])
@jwt_required()
def get_global_reviews():
    user_id = int(get_jwt_identity())
    
    # 1. Fetch all platform reviews sorted by newest
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)

    pagination = Review.query.options(
        selectinload(Review.reviewer),
        selectinload(Review.comments).selectinload(ReviewComment.user),
    ).order_by(Review.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    # 2. Calculate platform-wide average score
    avg_rating = db.session.query(func.avg(Review.rating)).scalar() or 0.0

    # 3. Check if current user has completed transactions
    completed_orders_count = Order.query.filter_by(buyer_id=user_id, status='delivered').count()
    can_review = completed_orders_count > 0

    # 4. Determine which reviews the current user has liked
    liked_review_ids = set(
        db.session.query(ReviewLike.review_id)
        .filter_by(user_id=user_id)
        .all()
    )

    reviews_dump = reviews_schema.dump(pagination.items)
    for rev in reviews_dump:
        rev['liked_by_current_user'] = rev['id'] in liked_review_ids

    return jsonify({
        "average_rating": round(avg_rating, 1),
        "total_reviews": pagination.total,
        "page": page,
        "pages": pagination.pages,
        "has_next": pagination.has_next,
        "has_prev": pagination.has_prev,
        "can_review": can_review,
        "reviews": reviews_dump,
    }), 200


@reviews_bp.route('/', methods=['POST'])
@reviews_bp.route('/farmer/<int:farmer_id>', methods=['POST'])
@jwt_required()
def create_review(farmer_id=None):
    reviewer_id = int(get_jwt_identity())

    # 1. Transaction Verification Guard: User MUST have at least one delivered transaction
    has_completed_transaction = Order.query.filter_by(
        buyer_id=reviewer_id,
        status='delivered'
    ).first() is not None

    if not has_completed_transaction:
        return jsonify({
            "message": "Access restricted: You must complete at least one transaction before posting product reviews."
        }), 403

    # 2. Extract input parameters (Handles both Multipart/Form-Data and JSON payloads)
    if request.is_json:
        data = request.get_json() or {}
        rating = data.get("rating")
        comment = data.get("comment", "")
        quality_freshness = data.get("quality_freshness")
        quality_accuracy = data.get("quality_accuracy")
        quality_packaging = data.get("quality_packaging")
        quality_delivery = data.get("quality_delivery")
        quality_communication = data.get("quality_communication")
        quality_honesty = data.get("quality_honesty")
        quality_fulfillment = data.get("quality_fulfillment")
        order_id = data.get("order_id")
    else:
        rating = request.form.get("rating")
        comment = request.form.get("comment", "")
        quality_freshness = request.form.get("quality_freshness")
        quality_accuracy = request.form.get("quality_accuracy")
        quality_packaging = request.form.get("quality_packaging")
        quality_delivery = request.form.get("quality_delivery")
        quality_communication = request.form.get("quality_communication")
        quality_honesty = request.form.get("quality_honesty")
        quality_fulfillment = request.form.get("quality_fulfillment")
        order_id = request.form.get("order_id")

    # Validate Rating without allowing malformed input to escape as a 500.
    try:
        rating = int(rating)
    except (TypeError, ValueError):
        rating = None
    if rating is None or not (1 <= rating <= 5):
        return jsonify({"message": "Rating must be an integer between 1 and 5"}), 400

    # Validate sub-ratings if provided
    for field_name, field_value in [
        ("quality_freshness", quality_freshness),
        ("quality_accuracy", quality_accuracy),
        ("quality_packaging", quality_packaging),
        ("quality_delivery", quality_delivery),
        ("quality_communication", quality_communication),
        ("quality_honesty", quality_honesty),
        ("quality_fulfillment", quality_fulfillment),
    ]:
        if field_value is not None:
            try:
                parsed_value = int(field_value)
            except (TypeError, ValueError):
                parsed_value = None
            if parsed_value is None or not (1 <= parsed_value <= 5):
                return jsonify({"message": f"{field_name} must be an integer between 1 and 5"}), 400

    # If order_id provided, verify it belongs to the reviewer and is delivered
    if order_id:
        try:
            order_id = int(order_id)
        except (TypeError, ValueError):
            return jsonify({"message": "Invalid order for review"}), 400
        order = db.session.get(Order, order_id)
        if not order or order.buyer_id != reviewer_id or order.status != 'delivered':
            return jsonify({"message": "Invalid order for review"}), 400
    else:
        order_id = None

    # 3. Handle Verification Image File Attachment
    image_url = None
    if 'verification_photo' in request.files:
        file = request.files['verification_photo']
        if file and file.filename != '' and allowed_file(file.filename):
            filename = secure_filename(f"review_{reviewer_id}_{file.filename}")
            
            # Ensure upload path exists
            upload_folder = os.path.join(current_app.root_path, 'static', 'uploads', 'reviews')
            os.makedirs(upload_folder, exist_ok=True)
            
            save_path = os.path.join(upload_folder, filename)
            file.save(save_path)
            
            # Dynamic static URL path for client retrieval
            image_url = f"/static/uploads/reviews/{filename}"

    # 4. Save Review to DB
    review = Review(
        reviewer_id=reviewer_id,
        farmer_id=farmer_id,
        order_id=order_id,
        rating=int(rating),
        quality_freshness=int(quality_freshness) if quality_freshness else None,
        quality_accuracy=int(quality_accuracy) if quality_accuracy else None,
        quality_packaging=int(quality_packaging) if quality_packaging else None,
        quality_delivery=int(quality_delivery) if quality_delivery else None,
        quality_communication=int(quality_communication) if quality_communication else None,
        quality_honesty=int(quality_honesty) if quality_honesty else None,
        quality_fulfillment=int(quality_fulfillment) if quality_fulfillment else None,
        quality_score=round(sum(filter(None, [
            int(quality_freshness) if quality_freshness else None,
            int(quality_accuracy) if quality_accuracy else None,
            int(quality_packaging) if quality_packaging else None,
            int(quality_delivery) if quality_delivery else None,
            int(quality_communication) if quality_communication else None,
            int(quality_honesty) if quality_honesty else None,
            int(quality_fulfillment) if quality_fulfillment else None,
        ])) / len([x for x in [
            quality_freshness, quality_accuracy, quality_packaging, quality_delivery,
            quality_communication, quality_honesty, quality_fulfillment
        ] if x is not None]), 1) if any([quality_freshness, quality_accuracy, quality_packaging, quality_delivery, quality_communication, quality_honesty, quality_fulfillment]) else None,
        verified_purchase=bool(order_id),
        comment=comment,
        image_url=image_url  
    )

    db.session.add(review)
    db.session.commit()

    return review_schema.jsonify(review), 201


@reviews_bp.route('/<int:review_id>/like', methods=['POST'])
@jwt_required()
def like_review(review_id):
    user_id = int(get_jwt_identity())
    review = db.get_or_404(Review, review_id)

    existing = ReviewLike.query.filter_by(review_id=review_id, user_id=user_id).first()
    if existing:
        db.session.delete(existing)
        review.like_count = max(0, review.like_count - 1)
    else:
        db.session.add(ReviewLike(review_id=review_id, user_id=user_id))
        review.like_count += 1

    db.session.commit()
    return jsonify({
        'like_count': review.like_count,
        'liked_by_current_user': existing is None,
    }), 200


@reviews_bp.route('/<int:review_id>/comments', methods=['GET'])
@jwt_required()
def get_comments(review_id):
    db.get_or_404(Review, review_id)
    comments = ReviewComment.query.options(
        selectinload(ReviewComment.user)
    ).filter_by(review_id=review_id).order_by(ReviewComment.created_at).all()
    return review_comments_schema.jsonify(comments), 200


@reviews_bp.route('/<int:review_id>/comments', methods=['POST'])
@jwt_required()
def add_comment(review_id):
    user_id = int(get_jwt_identity())
    db.get_or_404(Review, review_id)
    data = request.get_json(silent=True) or {}
    text = (data.get('text') or '').strip()

    if not text:
        return jsonify({'message': 'Comment text is required'}), 400

    comment = ReviewComment(review_id=review_id, user_id=user_id, text=text)
    db.session.add(comment)
    db.session.commit()

    return review_comment_schema.jsonify(comment), 201


@reviews_bp.route('/farmer/<int:farmer_id>/summary', methods=['GET'])
@jwt_required()
def get_farmer_review_summary(farmer_id):
    """Get review summary for a farmer including average sub-ratings"""
    user_id = int(get_jwt_identity())

    reviews = Review.query.filter_by(farmer_id=farmer_id).all()
    if not reviews:
        return jsonify({
            'total_reviews': 0,
            'average_rating': 0,
            'quality_breakdown': {}
        }), 200

    total = len(reviews)
    avg_rating = sum(r.rating for r in reviews) / total

    # Calculate average for each sub-rating
    sub_ratings = {
        'quality_freshness': [],
        'quality_accuracy': [],
        'quality_packaging': [],
        'quality_delivery': [],
        'quality_communication': [],
        'quality_honesty': [],
        'quality_fulfillment': [],
    }

    for r in reviews:
        for key in sub_ratings:
            val = getattr(r, key)
            if val is not None:
                sub_ratings[key].append(val)

    quality_breakdown = {}
    for key, values in sub_ratings.items():
        if values:
            quality_breakdown[key] = round(sum(values) / len(values), 1)
        else:
            quality_breakdown[key] = None

    return jsonify({
        'total_reviews': total,
        'average_rating': round(avg_rating, 1),
        'quality_breakdown': quality_breakdown,
    }), 200
