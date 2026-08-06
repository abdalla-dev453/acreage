from flask import Blueprint, jsonify, request
from app import db
from app.models.user import User
from app.schemas.user import UserSchema
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

auth_bp = Blueprint('auth', __name__)

# 1. FIXED: Changed method constraint from 'GET' to 'POST'
@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    email = data.get('email')
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'farmer')

    if not email or not username or not password:
        return jsonify({'message': 'Email, username, and password are required'}), 400

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

    # Log user in instantly by issuing a new JWT access token upon successful signup
    access_token = create_access_token(identity=str(user.id))
    return jsonify({
        'token': access_token,
        'user': UserSchema().dump(user),
        'message': 'Account created successfully'
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({'message': 'Invalid email or password'}), 401

    access_token = create_access_token(identity=str(user.id))
    return jsonify({
        'token': access_token,
        'user': UserSchema().dump(user)
    }), 200


# 2. FIXED: Added the mandatory @jwt_required() decorator wrapper hook
@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_profile():
    current_user_id = get_jwt_identity()
    user = User.query.get_or_404(int(current_user_id))
    return jsonify(UserSchema().dump(user)), 200


# 3. ADDED: New protected route to supply real contacts data directly to your frontend Chat List
@auth_bp.route('/users', methods=['GET'])
@jwt_required()
def get_all_users():
    users = User.query.all()
    # Serialize the complete array ledger through your existing Marshmallow UserSchema
    return jsonify(UserSchema(many=True).dump(users)), 200
