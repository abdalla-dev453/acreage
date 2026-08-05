from flask import Blueprint, jsonify

farm_logs_bp = Blueprint('farm_logs', __name__)

@farm_logs_bp.route('/', methods=['GET'])
def get_logs():
    return jsonify([]), 200