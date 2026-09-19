from flask import Blueprint, request, jsonify
from app import db
from app.models.chat import ChatMessage
from app.models.user import User
from app.schemas.chat import chat_messages_schema, chat_message_schema
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_, and_, func, desc
from sqlalchemy.orm import selectinload
from app.utils.http import json_object
from datetime import datetime, timedelta

chat_bp = Blueprint('chat', __name__)


@chat_bp.route('/<int:other_user_id>', methods=['GET'])
@jwt_required()
def get_thread(other_user_id):
    current_user_id = int(get_jwt_identity())
    
    # 1. High-UX Feature: Automatically mark incoming messages as read upon fetching the thread
    unread_incoming_messages = ChatMessage.query.filter_by(
        sender_id=other_user_id, 
        receiver_id=current_user_id, 
        is_read=False
    ).all()
    
    for msg in unread_incoming_messages:
        msg.is_read = True
        
    if unread_incoming_messages:
        db.session.commit() # Save changes to the ledger right away


    # 2. Extract the complete bidirectional communication history array
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 50, type=int), 100)

    messages_query = ChatMessage.query.options(
        selectinload(ChatMessage.sender),
        selectinload(ChatMessage.receiver),
    ).filter(
        or_(
            and_(ChatMessage.sender_id == current_user_id, ChatMessage.receiver_id == other_user_id),
            and_(ChatMessage.sender_id == other_user_id, ChatMessage.receiver_id == current_user_id)
        )
    ).order_by(ChatMessage.created_at.asc())

    pagination = messages_query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'items': chat_messages_schema.dump(pagination.items),
        'total': pagination.total,
        'page': page,
        'pages': pagination.pages,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev,
    }), 200



@chat_bp.route('/', methods=['POST'])
@jwt_required()
def send_message():
    current_user_id = int(get_jwt_identity())
    data, error = json_object()
    if error:
        return error

    # Validate incoming message request parameters safely
    receiver_id = data.get('receiver_id')
    message_text = data.get('message')
    
    if not receiver_id or not message_text or not str(message_text).strip():
        return jsonify({'message': 'Receiver identity and text content parameters are required'}), 400

    msg = ChatMessage(
        sender_id=current_user_id,
        receiver_id=int(receiver_id),
        message=message_text.strip(),
        is_read=False # Explicitly initialize as unread
    )
    
    db.session.add(msg)
    db.session.commit()

    return chat_message_schema.jsonify(msg), 201


@chat_bp.route('/conversations', methods=['GET'])
@jwt_required()
def get_conversations():
    current_user_id = int(get_jwt_identity())

    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 50, type=int), 100)

    all_msgs = db.session.query(ChatMessage).options(
        selectinload(ChatMessage.sender),
        selectinload(ChatMessage.receiver),
    ).filter(
        or_(
            ChatMessage.sender_id == current_user_id,
            ChatMessage.receiver_id == current_user_id,
        )
    ).order_by(ChatMessage.created_at.desc()).limit(500).all()

    # Build conversation summaries
    conv_map = {}
    for msg in all_msgs:
        other_id = msg.receiver_id if msg.sender_id == current_user_id else msg.sender_id
        if other_id not in conv_map:
            unread = db.session.query(func.count(ChatMessage.id)).filter(
                ChatMessage.sender_id == other_id,
                ChatMessage.receiver_id == current_user_id,
                ChatMessage.is_read == False,
            ).scalar()
            conv_map[other_id] = {
                'other_user_id': other_id,
                'last_message': msg.message,
                'last_message_at': msg.created_at.isoformat() if msg.created_at else None,
                'is_read': msg.is_read if msg.sender_id == current_user_id else True,
                'unread_count': unread or 0,
                'is_incoming': msg.sender_id != current_user_id,
            }

    # Fetch all users for display info (only those we've messaged)
    from app.models.user import User
    user_ids = list(conv_map.keys())
    users = db.session.get(User, user_ids) if len(user_ids) == 1 else \
        db.session.execute(db.select(User).where(User.id.in_(user_ids))).scalars().all() if user_ids else []

    user_map = {u.id: u for u in users}

    conversations = []
    for other_id, conv in conv_map.items():
        u = user_map.get(other_id, {})
        conversations.append({
            'id': other_id,
            'username': getattr(u, 'username', 'Unknown'),
            'email': getattr(u, 'email', ''),
            'role': getattr(u, 'role', ''),
            'location': getattr(u, 'location', ''),
            'last_message': conv['last_message'],
            'last_message_at': conv['last_message_at'],
            'is_read': conv['is_read'],
            'unread_count': conv['unread_count'],
            'is_incoming': conv['is_incoming'],
        })

    conversations.sort(key=lambda c: c['last_message_at'] or '', reverse=True)

    start = (page - 1) * per_page
    end = start + per_page
    paginated = conversations[start:end]

    return jsonify({
        'items': paginated,
        'total': len(conversations),
        'page': page,
        'pages': (len(conversations) + per_page - 1) // per_page,
        'has_next': end < len(conversations),
        'has_prev': start > 0,
    }), 200


@chat_bp.route('/unread-count', methods=['GET'])
@jwt_required()
def get_unread_count():
    current_user_id = int(get_jwt_identity())
    count = db.session.query(func.count(ChatMessage.id)).filter(
        ChatMessage.receiver_id == current_user_id,
        ChatMessage.is_read == False,
    ).scalar()
    return jsonify({'unread_count': count or 0}), 200


@chat_bp.route('/online', methods=['GET'])
@jwt_required()
def get_online_users():
    current_user_id = int(get_jwt_identity())
    since = datetime.utcnow() - timedelta(minutes=10)

    active_user_ids = db.session.query(
        ChatMessage.sender_id
    ).filter(
        ChatMessage.created_at >= since
    ).union(
        db.session.query(ChatMessage.receiver_id).filter(
            ChatMessage.created_at >= since
        )
    ).distinct().all()

    online_ids = {row[0] for row in active_user_ids if row[0] != current_user_id}

    return jsonify({'online_user_ids': list(online_ids)}), 200


@chat_bp.route('/<int:other_user_id>/mark-read', methods=['POST'])
@jwt_required()
def mark_thread_read(other_user_id):
    current_user_id = int(get_jwt_identity())
    ChatMessage.query.filter(
        ChatMessage.sender_id == other_user_id,
        ChatMessage.receiver_id == current_user_id,
        ChatMessage.is_read == False,
    ).update({'is_read': True})
    db.session.commit()
    return jsonify({'message': 'Thread marked as read'}), 200


@chat_bp.route('/<int:msg_id>', methods=['DELETE'])
@jwt_required()
def delete_message(msg_id):
    current_user_id = int(get_jwt_identity())
    msg = db.session.get(ChatMessage, msg_id)
    if not msg:
        return jsonify({'message': 'Message not found'}), 404
    if msg.sender_id != current_user_id:
        return jsonify({'message': 'Cannot delete another user\'s message'}), 403
    db.session.delete(msg)
    db.session.commit()
    return jsonify({'message': 'Message deleted'}), 200
