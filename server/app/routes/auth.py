from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash

auth_bp = Blueprint("auth", __name__)

# Temporary in-memory user store for fallback/testing
USERS_DB = {}

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    username = data.get("username") or data.get("email")
    password = data.get("password")
    
    if not username or not password:
        return jsonify({"error": "Username/Email and password required"}), 400
        
    if username in USERS_DB:
        return jsonify({"error": "User already exists"}), 400
        
    USERS_DB[username] = generate_password_hash(password)
    return jsonify({"message": "User registered successfully"}), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username = data.get("username") or data.get("email")
    password = data.get("password")
    
    if not username or not password:
        return jsonify({"error": "Username/Email and password required"}), 400
        
    hashed_password = USERS_DB.get(username)
    if not hashed_password or not check_password_hash(hashed_password, password):
        return jsonify({"error": "Invalid credentials"}), 401
        
    access_token = create_access_token(identity=username)
    return jsonify({"access_token": access_token}), 200

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    current_user = get_jwt_identity()
    return jsonify({"username": current_user}), 200
