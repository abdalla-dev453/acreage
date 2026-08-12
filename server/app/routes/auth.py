from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from app import db
 
auth_bp = Blueprint("auth", __name__)

# Database Model for Users
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

@auth_bp.before_app_request
def create_tables():
    db.create_all()

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    username = data.get("username") or data.get("email")
    password = data.get("password")
    
    if not username or not password:
        return jsonify({"error": "Username/Email and password required"}), 400
        
    base_user = User.query.filter_by(username=username).first()
    if base_user:
        return jsonify({"error": "User already exists"}), 400
        
    new_user = User(username=username)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"message": "User registered successfully"}), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username = data.get("username") or data.get("email")
    password = data.get("password")
    
    if not username or not password:
        return jsonify({"error": "User/Email and password required"}), 400
        
    current_user = User.query.filter_by(username=username).first()
    if not current_user or not current_user.check_password(password):
        return jsonify({"error": "Invalid credentials"}), 401
        
    access_token = create_access_token(identity=username)
    return jsonify({"access_token": access_token}), 200

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    current_user = get_jwt_identity()
    return jsonify({"username": current_user}), 200
