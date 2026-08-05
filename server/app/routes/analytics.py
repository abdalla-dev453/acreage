from flask import Blueprint, jsonify

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/', methods=['GET'])
def get_analytics():
    return jsonify({"total_orders": 0, "total_revenue": 0.0}), 200