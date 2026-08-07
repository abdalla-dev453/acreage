from flask import Blueprint, request, jsonify
from app import db
from app.models.review import Review
from app.models.user import User
from app.schemas.review import review_schema, reviews_schema
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func


reviews_bp = Blueprint('reviews', __name__)

@reviews_bp.route('/', methods=['GET'])
@jwt_required()
def get_global_reviews():
    # Fetch all reviews across the platform sorted by latest entry
    all_reviews = Review.query.order_by(Review.created_at.desc()).all()
    
    # Calculate a platform-wide average score safely
    avg_rating = db.session.query(func.avg(Review.rating)).scalar() or 0.0
    
    return jsonify({
        "average_rating": round(avg_rating, 1),
        "total_reviews": len(all_reviews), 
        "reviews": reviews_schema.dump(all_reviews)
    }), 200



@reviews_bp.route('/farmer/<int:farmer_id>', methods=['POST'])
@jwt_required()
def create_review(farmer_id):
    reviewer_id = int(get_jwt_identity())
    data = request.get_json() or {}

    rating = data.get("rating")
    if not rating or not (1 <= int(rating) <= 5):
        return jsonify({"message": "Rating must be between 1 and 5"}), 400

    farmer = User.query.get_or_404(farmer_id)
    if farmer.role != "farmer":
        return jsonify({"message": "Reviews can only be submitted for farmers"}), 400

    review = Review(
        reviewer_id=reviewer_id,
        farmer_id=farmer_id,
        rating=int(rating),
        comment=data.get("comment", "")
    )

    db.session.add(review)
    db.session.commit()

    return review_schema.jsonify(review), 201