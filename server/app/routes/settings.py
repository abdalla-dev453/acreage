from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import get_jwt_identity, jwt_required
from app import db
from app.models.user import User
from app.schemas.user import user_schema
from app.utils.http import json_object
from app.utils.validators import validate_password, validate_email

settings_bp = Blueprint('settings', __name__)


@settings_bp.route('/preferences', methods=['GET'])
@jwt_required()
def get_preferences():
    user_id = int(get_jwt_identity())
    user = db.get_or_404(User, user_id)
    preferences = user.preferences_json or {}
    defaults = {
        'theme': preferences.get('theme', 'system'),
        'language': preferences.get('language', 'en'),
        'notifications': preferences.get('notifications', True),
        'sound': preferences.get('sound', True),
        'fontSize': preferences.get('fontSize', 'normal'),
        'compactMode': preferences.get('compactMode', False),
        'featureAnnouncements': preferences.get('featureAnnouncements', True),
        'betaProgram': preferences.get('betaProgram', False),
        'privateAccount': preferences.get('privateAccount', False),
        'twoFactorAuth': preferences.get('twoFactorAuth', False),
    }
    return jsonify({'preferences': defaults}), 200


@settings_bp.route('/preferences', methods=['PUT'])
@jwt_required()
def update_preferences():
    user_id = int(get_jwt_identity())
    user = db.get_or_404(User, user_id)
    data, error = json_object()
    if error:
        return error

    allowed_keys = {
        'theme', 'language', 'notifications', 'sound', 'fontSize',
        'compactMode', 'featureAnnouncements', 'betaProgram',
        'privateAccount', 'twoFactorAuth'
    }
    valid_updates = {}
    for key, value in data.items():
        if key in allowed_keys:
            valid_updates[key] = value

    current = user.preferences_json or {}
    current.update(valid_updates)
    user.preferences_json = current
    db.session.commit()
    return jsonify({'preferences': current, 'message': 'Preferences saved'}), 200


@settings_bp.route('/account', methods=['GET'])
@jwt_required()
def get_account():
    user_id = int(get_jwt_identity())
    user = db.get_or_404(User, user_id)
    return jsonify({
        'user': user_schema.dump(user),
        'preferences': user.preferences_json or {},
    }), 200


@settings_bp.route('/account', methods=['PUT'])
@jwt_required()
def update_account():
    user_id = int(get_jwt_identity())
    user = db.get_or_404(User, user_id)
    data, error = json_object()
    if error:
        return error

    if 'username' in data:
        new_username = str(data['username']).strip()
        if not new_username:
            return jsonify({'message': 'Username cannot be empty'}), 400
        if new_username != user.username and User.query.filter_by(username=new_username).first():
            return jsonify({'message': 'Username already taken'}), 400
        user.username = new_username

    if 'email' in data:
        new_email = str(data['email']).strip()
        if not validate_email(new_email):
            return jsonify({'message': 'Invalid email format'}), 400
        if new_email != user.email and User.query.filter_by(email=new_email).first():
            return jsonify({'message': 'Email already in use'}), 400
        user.email = new_email

    if 'phone_number' in data:
        user.phone_number = str(data['phone_number']).strip() or None

    if 'location' in data:
        user.location = str(data['location']).strip() or None

    if 'current_password' in data or 'new_password' in data:
        current_password = data.get('current_password', '')
        new_password = data.get('new_password', '')
        if not current_password:
            return jsonify({'message': 'Current password is required to change your password'}), 400
        if not user.check_password(current_password):
            return jsonify({'message': 'Current password is incorrect'}), 403
        valid, msg = validate_password(new_password)
        if not valid:
            return jsonify({'message': msg}), 400
        user.set_password(new_password)

    if 'avatar' in request.files:
        from werkzeug.utils import secure_filename
        import os
        file = request.files['avatar']
        if file and file.filename:
            allowed_ext = {'png', 'jpg', 'jpeg', 'webp'}
            if '.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_ext:
                filename = secure_filename(f"avatar_{user.id}_{file.filename}")
                upload_folder = os.path.join(current_app.root_path, 'static', 'uploads', 'avatars')
                os.makedirs(upload_folder, exist_ok=True)
                file.save(os.path.join(upload_folder, filename))
                user.avatar_url = f"/static/uploads/avatars/{filename}"

    db.session.commit()
    return jsonify({'message': 'Account updated', 'user': user_schema.dump(user)}), 200


@settings_bp.route('/account', methods=['DELETE'])
@jwt_required()
def delete_account():
    user_id = int(get_jwt_identity())
    user = db.get_or_404(User, user_id)
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'Account deactivated. All associated data has been removed.'}), 200


@settings_bp.route('/feedback', methods=['POST'])
@jwt_required()
def submit_feedback():
    user_id = int(get_jwt_identity())
    user = db.get_or_404(User, user_id)
    data, error = json_object()
    if error:
        return error
    feedback = str(data.get('message', '')).strip()
    rating = data.get('rating')
    if not feedback:
        return jsonify({'message': 'Feedback message is required'}), 400
    if rating is not None:
        try:
            rating = int(rating)
            if rating < 1 or rating > 5:
                return jsonify({'message': 'Rating must be between 1 and 5'}), 400
        except (TypeError, ValueError):
            return jsonify({'message': 'Rating must be an integer'}), 400
    preferences = user.preferences_json or {}
    feedbacks = preferences.get('feedback', [])
    feedbacks.append({'message': feedback, 'rating': rating})
    preferences['feedback'] = feedbacks
    user.preferences_json = preferences
    db.session.commit()
    return jsonify({'message': 'Feedback submitted. Thank you for helping improve Acreage.'}), 201
