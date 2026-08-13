import os
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func

from app import db
from app.models.review import Review
from app.models.user import User
from app.models.order import Order # Assuming your Order model is located here
from app.schemas.review import review_schema, reviews_schema

reviews_bp = Blueprint('reviews', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@reviews_bp.route('/', methods=['GET'])
@jwt_required()
def get_global_reviews():
    user_id = int(get_jwt_identity())
    
    # 1. Fetch all platform reviews sorted by newest
    all_reviews = Review.query.order_by(Review.created_at.desc()).all()
    
    # 2. Calculate platform-wide average score
    avg_rating = db.session.query(func.avg(Review.rating)).scalar() or 0.0
    
    # 3. Check if current user has completed transactions (e.g. orders with status 'completed' or 'delivered')
    completed_orders_count = Order.query.filter_by(buyer_id=user_id, status='completed').count()
    can_review = completed_orders_count > 0

    return jsonify({
        "average_rating": round(avg_rating, 1),
        "total_reviews": len(all_reviews), 
        "can_review": can_review,
        "reviews": reviews_schema.dump(all_reviews)
    }), 200


@reviews_bp.route('/', methods=['POST'])
@reviews_bp.route('/farmer/<int:farmer_id>', methods=['POST'])
@jwt_required()
def create_review(farmer_id=None):
    reviewer_id = int(get_jwt_identity())

    # 1. Transaction Verification Guard: User MUST have at least one completed transaction
    has_completed_transaction = Order.query.filter_by(
        buyer_id=reviewer_id, 
        status='completed'
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
    else:
        rating = request.form.get("rating")
        comment = request.form.get("comment", "")

    # Validate Rating
    if not rating or not (1 <= int(rating) <= 5):
        return jsonify({"message": "Rating must be an integer between 1 and 5"}), 400

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
        rating=int(rating),
        comment=comment,
        image_url=image_url  
    )

    db.session.add(review)
    db.session.commit()

    return review_schema.jsonify(review), 201