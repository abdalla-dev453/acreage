from flask import Blueprint, jsonify

products_bp = Blueprint('products', __name__)

@products_bp.route('/', methods=['GET'])
def list_products():
    return jsonify([]), 200