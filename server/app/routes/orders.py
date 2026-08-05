from flask import Blueprint, jsonify

orders_bp = Blueprint('orders', __name__)

@orders_bp.route('/', methods=['GET'])
def list_orders():
    return jsonify([]), 200