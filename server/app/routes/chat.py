from flask import Blueprint, request, jsonify
from app import db
from app.models.chat import ChatMessage
from app.schemas.chat import chat_messages_schema, chat_message_schema
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_, and_

chat_bp = Blueprint('chat', __name__)


@chat_bp.route('/<int:other_user_id>', methods=['GET'])
@jwt_required()
def get_thread(other_user_id):
    current_user_id = int(get_jwt_identity())
    messages = ChatMessage.query.filter(
        or_(
            and_(ChatMessage.sender_id == current_user_id, ChatMessage.receiver_id == other_user_id),
            and_(ChatMessage.sender_id == other_user_id, ChatMessage.receiver_id == current_user_id)
        )
    ).order_by(ChatMessage.created_at.asc()).all()
    return chat_messages_schema.jsonify(messages), 200



@chat_bp.route('/', methods=['POST'])
@jwt_required()
def send_message():
    current_user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    msg = ChatMessage(
        sender_id=current_user_id,
        receiver_id=data.get('receiver_id'),
        message=data.get('message')
    )
    db.session.add(msg)
    db.session.commit()
    return chat_message_schema.jsonify(msg), 201