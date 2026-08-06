from flask import Blueprint, jsonify, request
from app.models.product import Product
from app import db
from app.schemas.product import product_schema, products_schema
from flask_jwt_extended import jwt_required, get_jwt_identity

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
    product = Product.query.get_or_404(product_id)
    return product_schema.jsonify(product), 200


@products_bp.route('/', methods=['POST'])
@jwt_required()
def create_product():
    current_user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    product = Product(
        farmer_id=current_user_id,
        title=data.get('title'),
        category=data.get('category'),
        description=data.get('description'),
        price_per_unit=data.get('price_per_unit'),
        unit=data.get('unit', 'kg'),
        stock_quantity=data.get('stock_quantity', 0.0),
        image_url=data.get('image_url'),
    )

    db.session.add(product)
    db.session.commit()
    return product_schema.jsonify(product), 201


@products_bp.route('/<int:product_id>', methods=['PUT'])
@jwt_required()
def update_product(product_id):
    current_user_id = int(get_jwt_identity())
    product = Product.query.get_or_404(product_id)

    if product.farmer_id != current_user_id:
        return jsonify({'message': 'Unauthorized to modify this product'}), 403

    data = request.get_json() or {}
    product.title = data.get('title', product.title)
    product.category = data.get('category', product.category)
    product.description = data.get('description', product.description)
    product.price_per_unit = data.get('price_per_unit', product.price_per_unit)  
    product.unit = data.get('unit', product.unit)
    product.stock_quantity = data.get('stock_quantity', product.stock_quantity)
    product.is_available = data.get('is_available', product.is_available)

    db.session.commit()
    return product_schema.jsonify(product), 200