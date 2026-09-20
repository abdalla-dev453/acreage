from flask import Blueprint, jsonify, request
from app.models.product import Product
from app.models.user import User  # Imported User model to run role verifications
from app import db
from app.schemas.product import product_schema, products_schema
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.http import json_object
from sqlalchemy.orm import selectinload

products_bp = Blueprint('products', __name__)


@products_bp.route('/', methods=['GET'])
def get_products():
    category = request.args.get('category')
    query = Product.query.filter_by(is_available=True)

    if category:
        query = query.filter_by(category=category)

    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)

    query = query.options(selectinload(Product.farmer)).order_by(Product.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'items': products_schema.dump(pagination.items),
        'total': pagination.total,
        'page': page,
        'pages': pagination.pages,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev,
    }), 200


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
        unit_weight_kg = float(data['unit_weight_kg']) if data.get('unit_weight_kg') is not None else None
        video_duration_seconds = int(data['video_duration_seconds']) if data.get('video_duration_seconds') is not None else None
    except (ValueError, TypeError):
        return jsonify({'message': 'Invalid data format for price, stock, unit weight, or video duration.'}), 400
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
        unit_weight_kg=unit_weight_kg,
        stock_quantity=stock,
        image_url=data.get('image_url'),
        video_url=data.get('video_url'),
        video_duration_seconds=video_duration_seconds,
        is_available=True,
        is_premium=bool(data.get('is_premium', False)),
        allows_group_buying=bool(data.get('allows_group_buying', False)),
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
    product.video_url = data.get('video_url', product.video_url)
    if 'unit_weight_kg' in data:
        try:
            product.unit_weight_kg = float(data['unit_weight_kg']) if data['unit_weight_kg'] is not None else None
        except (ValueError, TypeError):
            return jsonify({'message': 'Invalid unit weight format'}), 400
    if 'video_duration_seconds' in data:
        try:
            product.video_duration_seconds = int(data['video_duration_seconds']) if data['video_duration_seconds'] is not None else None
        except (ValueError, TypeError):
            return jsonify({'message': 'Invalid video duration format'}), 400
    product.is_available = data.get('is_available', product.is_available)
    product.is_premium = data.get('is_premium', product.is_premium)
    product.allows_group_buying = data.get('allows_group_buying', product.allows_group_buying)

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
