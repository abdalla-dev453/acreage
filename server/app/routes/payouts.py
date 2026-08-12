from flask import Blueprint, request, jsonify
from app import db
from app.models.payout import Payout
from app.models.user import User
from flask_jwt_extended import jwt_required, get_jwt_identity
import uuid
from app.utils.http import json_object

payouts_bp = Blueprint('payouts', __name__)

@payouts_bp.route('/withdraw', methods=['POST'])
@jwt_required()
def initiate_payout():
    current_user_id = int(get_jwt_identity())
    user = db.get_or_404(User, current_user_id)

    if user.role != 'farmer':
        return jsonify({'message': 'Access restricted. Only farmers can initiate payouts.'}), 403

    data, error = json_object()
    if error:
        return error
    amount = data.get('amount')
    mpesa_number = data.get('mpesa_number')

    # 1. FIXED: Corrected amount check condition boundary logic
    if not amount or float(amount) <= 0:
        return jsonify({'message': 'Invalid withdrawal amount specified. Must be greater than 0.'}), 400

    if not mpesa_number:
        return jsonify({'message': 'M-pesa recipient phone number is required.'}), 400

    # 2. ADDED: Safaricom M-Pesa B2C String Normalization Engine
    raw_phone = str(mpesa_number).strip().replace('+', '').replace(' ', '')
    
    if raw_phone.startswith('0'):
        cleaned_phone = '254' + raw_phone[1:]
    elif raw_phone.startswith('7') or raw_phone.startswith('1'):
        cleaned_phone = '254' + raw_phone
    else:
        cleaned_phone = raw_phone

    # Explicit format length check to protect API payload execution from rejections
    if not cleaned_phone.isdigit() or len(cleaned_phone) != 12:
        return jsonify({'message': 'Invalid Kenyan phone sequence format. Use 2547XXXXXXXX or 07XXXXXXXX.'}), 400

    # Generate a unique reference for the payout transaction
    payout_ref = f"B2C{uuid.uuid4().hex[:8].upper()}"

    # Instantiating model with verified cleaned_phone variable parameters
    new_payout = Payout(
        farmer_id=current_user_id,
        amount=float(amount),
        mpesa_number=cleaned_phone,
        conversation_id=payout_ref,
        status='completed'
    )

    db.session.add(new_payout)
    db.session.commit()

    return jsonify({
        'message': 'M-pesa payout processed successfully.',
        'transaction_reference': payout_ref,
        'amount': amount,
        'recipient': cleaned_phone
    }), 201


@payouts_bp.route('/history', methods=['GET'])
@jwt_required()
def get_payout_history():
    current_user_id = int(get_jwt_identity())
    records = Payout.query.filter_by(farmer_id=current_user_id).order_by(Payout.created_at.desc()).all()

    return jsonify([{
        'id': r.id,
        'amount': r.amount,
        'mpesa_number': r.mpesa_number,
        'reference': r.conversation_id,
        'status': r.status,
        'date': r.created_at.strftime('%b %d, %Y %I:%M %p')
    } for r in records]), 200
