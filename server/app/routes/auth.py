import hashlib
import logging
from flask import Blueprint, request, jsonify, current_app
from app import db
from app.models.user import User
from app.schemas.user import user_schema
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.utils.validators import validate_password, validate_email, sanitize_string
from app.utils.security import expiry, is_valid_token, new_token, send_security_email
from app.utils.http import json_object

auth_bp = Blueprint('auth', __name__)
logger = logging.getLogger(__name__)


def _send_verification(user):
    token, token_hash = new_token()
    user.verification_token_hash = token_hash
    user.verification_token_expires_at = expiry(current_app.config['SECURITY_TOKEN_EXPIRES_MINUTES'])
    link = f"{current_app.config['FRONTEND_URL']}/verify-email?token={token}"
    send_security_email(current_app, user.email, 'Verify your Acreage account', f'Verify your account: {link}')
    logger.info('Verification requested', extra={'user_id': user.id})


@auth_bp.route('/register', methods=['POST'])
def register():
    data, error = json_object()
    if error:
        return error

    username = sanitize_string(data.get('username'))
    email = sanitize_string(data.get('email'))
    password = data.get('password')
    role = sanitize_string(data.get('role', 'farmer'))
    phone_number = sanitize_string(data.get('phone_number'))
    location = sanitize_string(data.get('location'))

    if not email or not username or not password:
        return jsonify({'message': 'Missing required fields'}), 400

    if not validate_email(email):
        return jsonify({'message': 'Invalid email format'}), 400

    pwd_result = validate_password(password)
    is_valid_pwd = pwd_result[0] if isinstance(pwd_result, tuple) else pwd_result
    if not is_valid_pwd:
        return jsonify({'message': pwd_result[1]}), 400

    if role not in {'farmer', 'buyer'}:
        return jsonify({'message': 'Role must be either farmer or buyer'}), 400

    if User.query.filter((User.email == email) | (User.username == username)).first():
        return jsonify({'message': 'User with this email or username already exists'}), 400

    try:
        user = User(
            username=username,
            email=email,
            role=role,
            phone_number=phone_number,  # Used sanitized variable
            location=location          # Used sanitized variable
        )
        user.set_password(password)

        db.session.add(user)
        if current_app.config['EMAIL_VERIFICATION_REQUIRED']:
            _send_verification(user)
            message = 'Account created. Check your email to verify it before signing in.'
        else:
            # Local development commonly has no SMTP service. Production keeps
            # this disabled only when explicitly configured to do so.
            user.email_verified = True
            message = 'Account created. You can now sign in.'
        db.session.commit()
        return jsonify({'message': message}), 201

    except Exception:
        db.session.rollback()
        logger.exception('Registration failed')
        return jsonify({'message': 'Unable to create the account. Please try again.'}), 500



@auth_bp.route('/login', methods=['POST'])
def login():
    data, error = json_object()
    if error:
        return error
    login_identifier = sanitize_string(data.get('username') or data.get('email'))
    password = data.get('password')

    if not login_identifier or not password:
        return jsonify({'message': 'Username/Email and password required'}), 400

    user = User.query.filter((User.email == login_identifier) | (User.username == login_identifier)).first()
    if not user or not isinstance(password, str) or not user.check_password(password):
        logger.warning('Failed login', extra={'identifier': login_identifier})
        return jsonify({'message': 'Invalid credentials'}), 401

    if not user.email_verified:
        return jsonify({'message': 'Verify your email before signing in'}), 403

    access_token = create_access_token(identity=str(user.id))
    return jsonify({
        'token': access_token,
        'access_token': access_token,
        'user': user_schema.dump(user)
    }), 200


@auth_bp.route('/verify-email', methods=['POST'])
def verify_email():
    data, error = json_object()
    if error:
        return error
    token = data.get('token')
    token_hash = hashlib.sha256(token.encode()).hexdigest() if isinstance(token, str) else None
    user = User.query.filter_by(verification_token_hash=token_hash).first() if token_hash else None
    if not user or not is_valid_token(token, user.verification_token_hash, user.verification_token_expires_at):
        return jsonify({'message': 'Invalid or expired verification token'}), 400
    user.email_verified = True
    user.verification_token_hash = None
    user.verification_token_expires_at = None
    db.session.commit()
    logger.info('Email verified', extra={'user_id': user.id})
    return jsonify({'message': 'Email verified. You can now sign in.'}), 200


@auth_bp.route('/password-reset/request', methods=['POST'])
def request_password_reset():
    data, error = json_object()
    if error:
        return error
    email = sanitize_string(data.get('email'))
    user = User.query.filter_by(email=email).first() if email else None
    if user:
        token, token_hash = new_token()
        user.reset_token_hash = token_hash
        user.reset_token_expires_at = expiry(current_app.config['SECURITY_TOKEN_EXPIRES_MINUTES'])
        link = f"{current_app.config['FRONTEND_URL']}/reset-password?token={token}"
        send_security_email(current_app, user.email, 'Reset your Acreage password', f'Reset your password: {link}')
        db.session.commit()
        logger.info('Password reset requested', extra={'user_id': user.id})
    return jsonify({'message': 'If that email is registered, a reset link has been sent.'}), 200


@auth_bp.route('/password-reset/confirm', methods=['POST'])
def confirm_password_reset():
    data, error = json_object()
    if error:
        return error
    token, password = data.get('token'), data.get('password')
    token_hash = hashlib.sha256(token.encode()).hexdigest() if isinstance(token, str) else None
    user = User.query.filter_by(reset_token_hash=token_hash).first() if token_hash else None
    valid, message = validate_password(password)
    if not user or not is_valid_token(token, user.reset_token_hash, user.reset_token_expires_at):
        return jsonify({'message': 'Invalid or expired reset token'}), 400
    if not valid:
        return jsonify({'message': message}), 400
    user.set_password(password)
    user.reset_token_hash = None
    user.reset_token_expires_at = None
    db.session.commit()
    logger.info('Password reset completed', extra={'user_id': user.id})
    return jsonify({'message': 'Password updated. You can now sign in.'}), 200



@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_profile():
    current_user_id = get_jwt_identity()
    user = db.get_or_404(User, current_user_id)
    return user_schema.jsonify(user), 200
