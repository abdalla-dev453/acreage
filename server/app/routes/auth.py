import hashlib
import logging
import os
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from app import db, limiter
from app.models.admin import SuperadminSession
from app.utils import admin_auth, mfa
from flask_jwt_extended import decode_token
from app.models.user import User
from app.schemas.user import user_schema
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.utils.validators import validate_password, validate_email, sanitize_string
from app.utils.security import expiry, is_valid_token, new_token, send_security_email
from app.utils.http import json_object
from app.utils.time import utcnow

auth_bp = Blueprint('auth', __name__)
logger = logging.getLogger(__name__)

# `limiter` is imported from the app package on purpose. This module used to
# build its own Limiter instance, but only the shared one in app/__init__.py
# ever gets init_app() called — a second instance registers nothing with Flask,
# so every @limiter.limit in this file silently did nothing. Importing the
# shared object is what makes these limits actually enforce.
#
# The app-wide default is only a loose abuse backstop; these per-route limits
# are the real credential-stuffing guard on the unauthenticated auth endpoints.


def _send_verification(user):
    token, token_hash = new_token()
    user.verification_token_hash = token_hash
    user.verification_token_expires_at = expiry(current_app.config['SECURITY_TOKEN_EXPIRES_MINUTES'])
    link = f"{current_app.config['FRONTEND_URL']}/verify-email?token={token}"
    send_security_email(current_app, user.email, 'Verify your Acreage account', f'Verify your account: {link}')
    logger.info('Verification requested', extra={'user_id': user.id})


@auth_bp.route('/register', methods=['POST'])
@limiter.limit('5 per hour; 20 per day', override_defaults=True)
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
@limiter.limit('10 per minute; 30 per hour; 100 per day', override_defaults=True)
def login():
    data, error = json_object()
    if error:
        return error
    login_identifier = sanitize_string(data.get('username') or data.get('email'))
    password = data.get('password')

    if not login_identifier or not password:
        return jsonify({'message': 'Username/Email and password required'}), 400

    # ── Administrator-only hardening, applied before any credential work ──
    blocked = admin_auth.is_ip_blocked(admin_auth.client_ip())
    if blocked is not None:
        db.session.commit()
        logger.warning('Blocked admin login from a listed IP')
        return jsonify({'message': 'This address is not permitted to sign in.'}), 403

    user = User.query.filter((User.email == login_identifier) | (User.username == login_identifier)).first()
    is_admin_candidate = bool(user and user.is_privileged)

    if is_admin_candidate:
        locked, remaining, reason = admin_auth.lockout_state(
            login_identifier, admin_auth.client_ip())
        if locked:
            admin_auth.record_attempt(login_identifier, False, user_id=user.id,
                                     reason='locked_out')
            return jsonify({
                'message': reason,
                'retry_after_seconds': remaining,
                'code': 'admin_locked',
            }), 429

    if not user or not isinstance(password, str) or not user.check_password(password):
        logger.warning('Failed login', extra={'identifier': login_identifier})
        if is_admin_candidate:
            admin_auth.record_attempt(login_identifier, False, user_id=user.id,
                                     reason='bad_password')
        return jsonify({'message': 'Invalid credentials'}), 401

    if not user.email_verified:
        return jsonify({'message': 'Verify your email before signing in'}), 403

    # A frozen or suspended account keeps its data but must not be able to
    # authenticate. Checked after the password so the response does not reveal
    # whether the account exists.
    if not user.can_authenticate:
        logger.warning('Blocked login for %s account', user.account_status,
                       extra={'user_id': user.id})
        return jsonify({
            'message': f'This account is {user.account_status}.',
            'account_status': user.account_status,
            'reason': user.frozen_reason,
            'contact_admin': True,
        }), 403

    # ── Second factor for administrators ─────────────────────────────────
    # Checked after the password so a wrong password is still reported as a
    # wrong password, and so the response never reveals whether MFA is enrolled
    # for an account the attacker does not own.
    mfa_method = None
    if user.is_privileged and mfa.is_enabled(user):
        supplied = sanitize_string(data.get('mfa_code'))
        if not supplied:
            # A partial challenge token, not a session: no permissions are
            # granted, so a stolen challenge is useless on its own.
            challenge = create_access_token(
                identity=str(user.id),
                additional_claims={'ver': user.token_version, 'adm': 'mfa_pending'},
            )
            admin_auth.record_attempt(login_identifier, False, user_id=user.id,
                                     reason='mfa_required')
            return jsonify({
                'message': 'Two-factor authentication required.',
                'mfa_required': True,
                'mfa_challenge': challenge,
            }), 401

        try:
            outcome = mfa.verify(user, supplied)
        except mfa.MFAUnavailable:
            # Never fall back to allowing the login when the second factor
            # cannot be checked — that is the exact failure MFA prevents.
            logger.exception('MFA unavailable for user %s', user.id)
            admin_auth.record_attempt(login_identifier, False, user_id=user.id,
                                     reason='mfa_unavailable')
            return jsonify({
                'message': 'Two-factor authentication is temporarily unavailable.',
                'code': 'mfa_unavailable',
            }), 503

        if outcome == 'invalid':
            admin_auth.record_attempt(login_identifier, False, user_id=user.id,
                                     reason='mfa_failed')
            return jsonify({
                'message': 'Invalid verification code.',
                'mfa_required': True,
            }), 401
        mfa_method = 'recovery_code' if outcome == 'recovery' else 'totp'

    # 'ver' is compared against user.token_version on every subsequent request
    # (app/__init__.py), which is what makes freezing and session revocation
    # actually take effect before the token would have expired.
    access_token = create_access_token(
        identity=str(user.id), additional_claims={'ver': user.token_version}
    )
    user.last_login_at = utcnow()

    if user.is_privileged:
        admin_auth.record_attempt(login_identifier, True, user_id=user.id)
        session = admin_auth.start_session(
            user, jti=decode_token(access_token).get('jti'),
            mfa_verified=bool(mfa_method), mfa_method=mfa_method,
        )
        if mfa_method == 'recovery_code':
            logger.warning('ADMIN SIGN-IN via recovery code: %s', user.username)

    if user.is_superadmin:
        # Privileged sign-ins get their own log so that reviewing "who has been
        # logging in as admin" does not depend on the general audit table.
        db.session.add(SuperadminSession(
            user_id=user.id,
            ip_address=request.headers.get('X-Forwarded-For', request.remote_addr),
            user_agent=(request.headers.get('User-Agent') or '')[:255],
            was_successful=True,
        ))
        logger.warning('SUPERADMIN SIGN-IN: %s from %s', user.username,
                       request.headers.get('X-Forwarded-For', request.remote_addr))

    db.session.commit()

    return jsonify({
        'token': access_token,
        'access_token': access_token,
        'user': user_schema.dump(user)
    }), 200


@auth_bp.route('/verify-email', methods=['POST'])
@limiter.limit('20 per hour', override_defaults=True)
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
@limiter.limit('5 per hour', override_defaults=True)
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
@limiter.limit('10 per hour', override_defaults=True)
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
    # JWT identities are stored as strings; the primary key is an integer.
    current_user_id = int(get_jwt_identity())
    user = db.get_or_404(User, current_user_id)
    return user_schema.jsonify(user), 200


@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update the authenticated user's profile (partial updates supported)."""
    # JWT identities are stored as strings; the primary key is an integer.
    current_user_id = int(get_jwt_identity())
    user = db.get_or_404(User, current_user_id)

    data, error = json_object()
    if error:
        return error

    # Map frontend field names to model attributes
    username = sanitize_string(data.get('username'))
    email = sanitize_string(data.get('email'))
    phone = sanitize_string(data.get('phone') or data.get('phone_number'))
    location = sanitize_string(data.get('location'))
    current_password = data.get('current_password')
    new_password = data.get('new_password')

    # Update basic profile fields when provided
    if username is not None:
        if username != user.username and User.query.filter_by(username=username).first():
            return jsonify({'message': 'Username already taken'}), 400
        user.username = username

    if email is not None:
        if not validate_email(email):
            return jsonify({'message': 'Invalid email format'}), 400
        if email != user.email and User.query.filter_by(email=email).first():
            return jsonify({'message': 'Email already in use'}), 400
        user.email = email

    if phone is not None:
        user.phone_number = phone

    if location is not None:
        user.location = location

    # Handle avatar upload (multipart/form-data)
    if 'avatar' in request.files:
        file = request.files['avatar']
        if file and file.filename != '':
            allowed_ext = {'png', 'jpg', 'jpeg', 'webp'}
            if '.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_ext:
                filename = secure_filename(f"avatar_{user.id}_{file.filename}")
                upload_folder = os.path.join(current_app.root_path, 'static', 'uploads', 'avatars')
                os.makedirs(upload_folder, exist_ok=True)
                file.save(os.path.join(upload_folder, filename))
                user.avatar_url = f"/static/uploads/avatars/{filename}"

    # Handle password change if new_password is provided
    if new_password:
        if not current_password:
            return jsonify({'message': 'Current password is required to change your password'}), 400
        if not user.check_password(current_password):
            return jsonify({'message': 'Current password is incorrect'}), 403
        valid, msg = validate_password(new_password)
        if not valid:
            return jsonify({'message': msg}), 400
        user.set_password(new_password)

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        logger.exception('Profile update failed', extra={'user_id': user.id})
        return jsonify({'message': 'Unable to update profile. Please try again.'}), 500

    return jsonify({
        'message': 'Profile updated successfully',
        'user': user_schema.dump(user)
    }), 200


@auth_bp.route('/users', methods=['GET'])
@jwt_required()
def list_users():
    """Return other registered users for the chat contacts picker.

    This is a contact picker, not a directory. It previously returned every
    user's email and phone number to any authenticated caller. The phone number
    is the key needed to impersonate that user on the SMS and WhatsApp webhooks,
    which authenticate senders by phone number, so handing it to every logged-in
    account chained those two flaws together. Farmers who need the contact
    details of their own trading partners should use /api/orders/counterparties.
    """
    current_user_id = int(get_jwt_identity())
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    search = (request.args.get('q') or request.args.get('search') or '').strip()

    query = User.query.filter(User.id != current_user_id)
    if search:
        query = query.filter(User.username.ilike(f'%{search}%'))

    pagination = query.order_by(
        User.username.asc()
    ).paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'items': [{
            'id': u.id,
            'username': u.username,
            'role': u.role,
            'location': u.location or '',
        } for u in pagination.items],
        'total': pagination.total,
        'page': page,
        'pages': pagination.pages,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev,
    }), 200
