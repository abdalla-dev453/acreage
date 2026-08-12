from flask import Blueprint, request, jsonify
from app import db
from app.models.user import User
from app.schemas.user import user_schema
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    email = data.get('email')
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'farmer')

    if not email or not username or not password:
        return jsonify({'message': 'Missing required fields'}), 400

    if User.query.filter((User.email == email) | (User.username == username)).first():
        return jsonify({'message': 'User with this email or username already exists'}), 400

    user = User(
        username=username,
        email=email,
        role=role,
        phone_number=data.get('phone_number'),
        location=data.get('location')
    )
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    return user_schema.jsonify(user), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    # Accept either username or email input interchangeably from your React forms
    login_identifier = data.get('username') or data.get('email')
    password = data.get('password')

    if not login_identifier or not password:
        return jsonify({'message': 'Username/Email and password required'}), 400

    # Look up matching rows dynamically across both configuration fields
    user = User.query.filter((User.email == login_identifier) | (User.username == login_identifier)).first()
    if not user or not user.check_password(password):
        return jsonify({'message': 'Invalid credentials'}), 401

    access_token = create_access_token(identity=str(user.id))
    return jsonify({
        'token': access_token,
        'access_token': access_token,  # Kept as fallback alias to ensure frontend context saves token
        'user': user_schema.dump(user)
    }), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_profile():
    current_user_id = get_jwt_identity()
    user = User.query.get_or_404(current_user_id)
    return user_schema.jsonify(user), 200
