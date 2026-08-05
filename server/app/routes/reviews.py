from flask import Blueprint, jsonify

reviews_bp = Blueprint('reviews', __name__)

@reviews_bp.route('/', methods=['GET'])
def list_reviews():
    return jsonify([]), 200