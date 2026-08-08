from flask import Blueprint, request, jsonify
from app import db
from app.models.payout import Payout
from app.models.user import User
from flask_jwt_extended import jwt_required, get_jwt_identity
import uuid


payouts_bp = Blueprint('payouts', __name__)


@payouts_bp.route('/withdraw', methods=['POST'])
@jwt_required()
def initiate_payout():
    current_user_id = int(get_jwt_identity())
    user = User.query.get_or_404(current_user_id)

    if user.role != 'farmer':
        return jsonify({'message': 'Access restricted. Only farmers can initiate payouts.'}), 403

    data = request.get_json() or {}
    amount = data.get('amount')
    mpesa_number = data.get('mpesa_number')

    if not amount or not float(amount) <= 0:
        return jsonify({'message': 'Invalid withdrawal amount specified.'}), 400

    if not mpesa_number:
        return jsonify({'message': 'M-pesa recipient phone number is required.'}), 400


    # stimulate an M-pesa B2C API Request initialization
    # Generate a unique reference for the payout
    payout_ref = f"B2C{uuid.uuid4().hex[:8].upper()}"

    new_payout = Payout(
        farmer_id=current_user_id,
        amount=float(amount),
        mpesa_number=str(mpesa_number).strip(),
        conversation_id=payout_ref,
        status='completed'
    )\

    db.session.add(new_payout)
    db.session.commit()

    return jsonify({
        'message': 'M-pesa payout processed successfully.',
        'transaction_reference': payout_ref,
        'amount': amount,
        'recipient': mpesa_number
    }), 201


@payouts_bp.route('/history', methods=['GET'])
@jwt_required()
def get_payout_history():
    current_user_id = int(get_jwt_identity())
    records = Payout.query.filter_by(farmer_id=current_user_id).order_by(Payout.created_at.desc()).all()

    return jsonify([{
        'id':r.id,
        'amount': r.amount,
        'mpesa_number': r.mpesa_number,
        'reference': r.conversation_id,
        'status': r.status,
        'date': r.created_at.strftime('%b %d, %Y %I:%M %p')
    } for r in records]), 200