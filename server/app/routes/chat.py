from flask import Blueprint, request, jsonify
from app import db
from app.models.chat import ChatMessage
from app.schemas.chat import chat_messages_schema, chat_message_schema
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_, and_
from app.utils.http import json_object

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
