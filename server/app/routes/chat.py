from flask import Blueprint, jsonify

chat_bp = Blueprint('chat', __name__)

@chat_bp.route('/', methods=['GET'])
def get_chats():
    return jsonify([]), 200