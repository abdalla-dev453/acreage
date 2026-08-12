from flask import Blueprint, jsonify, request
from app.models.product import Product
from app.models.user import User  # Imported User model to run role verifications
from app import db
from app.schemas.product import product_schema, products_schema
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.http import json_object

products_bp = Blueprint('products', __name__)


@products_bp.route('/', methods=['GET'])
def get_products():
    category = request.args.get('category')
    query = Product.query.filter_by(is_available=True)

    if category:
        query = query.filter_by(category=category)

    products = query.order_by(Product.created_at.desc()).all()
    return products_schema.jsonify(products), 200


@products_bp.route('/<int:product_id>', methods=['GET'])
def get_product(product_id):
    product = db.get_or_404(Product, product_id)
    return product_schema.jsonify(product), 200


@products_bp.route('/', methods=['POST'])
@jwt_required()
def create_product():
    current_user_id = int(get_jwt_identity())
    
    # 1. ENHANCEMENT: Role Enforcement Guard block
    requesting_user = db.get_or_404(User, current_user_id)
    if requesting_user.role != 'farmer':
        return jsonify({'message': 'Access restricted. Only verified farmers can list agricultural products.'}), 403

    data, error = json_object()
    if error:
        return error

    # 2. ENHANCEMENT: Explicit type casting preventing model type allocation warnings
    try:
        price = float(data.get('price_per_unit', 0.0))
        stock = float(data.get('stock_quantity', 0.0))
    except (ValueError, TypeError):
        return jsonify({'message': 'Invalid data format for price or stock metrics.'}), 400
    title = data.get('title', '').strip() if isinstance(data.get('title'), str) else ''
    category = data.get('category', '').strip() if isinstance(data.get('category'), str) else ''
    if not title or not category or price < 0 or stock < 0:
        return jsonify({'message': 'Title and category are required; price and stock cannot be negative.'}), 400

    product = Product(
        farmer_id=current_user_id,
        title=title,
        category=category,
        description=data.get('description'),
        price_per_unit=price,
        unit=data.get('unit', 'kg'),
        stock_quantity=stock,
        image_url=data.get('image_url'),
        is_available=True
    )

    db.session.add(product)
    db.session.commit()
    return product_schema.jsonify(product), 201


@products_bp.route('/<int:product_id>', methods=['PUT'])
@jwt_required()
def update_product(product_id):
    current_user_id = int(get_jwt_identity())
    product = db.get_or_404(Product, product_id)

    # Ownership enforcement guard
    if product.farmer_id != current_user_id:
        return jsonify({'message': 'Unauthorized to modify this product listing'}), 403

    data, error = json_object()
    if error:
        return error
    
    # Update properties with fallbacks
    product.title = data.get('title', product.title)
    product.category = data.get('category', product.category)
    product.description = data.get('description', product.description)
    product.unit = data.get('unit', product.unit)
    product.is_available = data.get('is_available', product.is_available)

    # Cast optional numerical mutations smoothly
    if 'price_per_unit' in data:
        try:
            product.price_per_unit = float(data['price_per_unit'])
        except (ValueError, TypeError):
            return jsonify({'message': 'Invalid price format'}), 400
        if product.price_per_unit < 0:
            return jsonify({'message': 'Price cannot be negative'}), 400
            
    if 'stock_quantity' in data:
        try:
            product.stock_quantity = float(data['stock_quantity'])
        except (ValueError, TypeError):
            return jsonify({'message': 'Invalid stock format'}), 400
        if product.stock_quantity < 0:
            return jsonify({'message': 'Stock cannot be negative'}), 400

    db.session.commit()
    return product_schema.jsonify(product), 200


@products_bp.route('/<int:product_id>', methods=['DELETE'])
@jwt_required()
def delete_product(product_id):
    current_user_id = int(get_jwt_identity())
    product = db.get_or_404(Product, product_id)
    if product.farmer_id != current_user_id:
        return jsonify({'message': 'Unauthorized to delete this product listing'}), 403
    if product.order_items:
        return jsonify({'message': 'Products with order history cannot be deleted; mark them unavailable instead.'}), 409
    db.session.delete(product)
    db.session.commit()
    return '', 204
