from flask import Blueprint, jsonify, request
from app import db, limiter
from app.models.user import User
from app.schemas.user import UserSchema
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash

auth_bp = Blueprint('auth', __name__)

# Only these roles can ever be self-assigned at registration. Anything else
# in the request body (e.g. "admin") is rejected outright rather than
# silently accepted, since role gates payouts/product-listing/etc.
ALLOWED_ROLES = ('farmer', 'buyer')
MIN_PASSWORD_LENGTH = 8


@auth_bp.route('/register', methods=['POST'])
@limiter.limit("5 per minute")
def register():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''
    role = data.get('role', 'farmer')

    if not email or not username or not password:
        return jsonify({'message': 'Email, username, and password are required'}), 400

    if role not in ALLOWED_ROLES:
        return jsonify({'message': f"Role must be one of: {', '.join(ALLOWED_ROLES)}"}), 400

    if len(password) < MIN_PASSWORD_LENGTH:
        return jsonify({'message': f'Password must be at least {MIN_PASSWORD_LENGTH} characters'}), 400

    if User.query.filter((User.email == email) | (User.username == username)).first():
        return jsonify({'message': 'User with this email or username already exists'}), 400

    user = User(
        username=username,
        email=email,
        role=role,
        location=data.get('location'),
    )
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    return jsonify({
        'token': access_token,
        'user': UserSchema().dump(user),
        'message': 'Account created successfully'
    }), 201


@auth_bp.route('/login', methods=['POST'])
@limiter.limit("10 per minute")
def login():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({'message': 'Invalid email or password'}), 401

    access_token = create_access_token(identity=str(user.id))
    return jsonify({
        'token': access_token,
        'user': UserSchema().dump(user)
    }), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_profile():
    current_user_id = get_jwt_identity()
    user = User.query.get_or_404(int(current_user_id))
    return jsonify(UserSchema().dump(user)), 200


@auth_bp.route('/users', methods=['GET'])
@jwt_required()
def get_all_users():
    users = User.query.all()
    return jsonify(UserSchema(many=True).dump(users)), 200


# ADDED: Direct target endpoint to handle your frontend Profile.jsx update form triggers
@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    current_user_id = get_jwt_identity()
    user = User.query.get_or_404(int(current_user_id))
    data = request.get_json() or {}

    # 1. Update general field variables safely
    username = data.get('username', user.username).strip()
    email = data.get('email', user.email).strip()
    
    # Check uniqueness constraints if user modifies unique handles
    if username != user.username and User.query.filter_by(username=username).first():
        return jsonify({'message': 'Username is already taken'}), 400
    if email != user.email and User.query.filter_by(email=email).first():
        return jsonify({'message': 'Email is already registered'}), 400

    user.username = username
    user.email = email
    user.location = data.get('location', user.location)
    
    # Dynamic field assignment supporting custom metadata strings from Profile.jsx forms
    if 'phone' in data:
        user.phone_number = data.get('phone') # Maps back to user column models attribute 

    # 2. Check and handle security/credential mutations safely
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    
    if new_password:
        if not current_password or not user.check_password(current_password):
            return jsonify({'message': 'Verification failed. Current password is incorrect.'}), 401
        
        user.set_password(new_password)

    db.session.commit()
