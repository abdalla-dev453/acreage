from flask import Blueprint, request, jsonify
from app import db
from app.models.payout import Payout
from app.models.commerce import EscrowTransaction
from app.models.user import User
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
import uuid
import os
import base64
import datetime
import logging
import requests
from app.utils.mpesa import get_mpesa_access_token
from app.utils.http import json_object

payouts_bp = Blueprint('payouts', __name__)
logger = logging.getLogger(__name__)

# A Payout row is written with status 'Pending'/'completed'/'failed'. Anything
# in flight or already paid must be subtracted from the balance, otherwise a
# farmer can fire the same withdrawal twice before either settles.
PAYOUTS_HOLDING_FUNDS = ('Pending', 'pending', 'completed', 'Completed')


def withdrawable_balance(farmer_id):
    """Money a farmer may still withdraw: released escrow, less payouts in flight.

    Escrow only counts once it reaches 'released' — that is the point at which
    the platform holds the funds on the farmer's behalf. Funded-but-unreleased
    escrow is still the buyer's money.
    """
    released = (
        db.session.query(func.coalesce(func.sum(EscrowTransaction.amount), 0.0))
        .filter(
            EscrowTransaction.farmer_id == farmer_id,
            EscrowTransaction.status == 'released',
        )
        .scalar()
    ) or 0.0

    already_drawn = (
        db.session.query(func.coalesce(func.sum(Payout.amount), 0.0))
        .filter(
            Payout.farmer_id == farmer_id,
            Payout.status.in_(PAYOUTS_HOLDING_FUNDS),
        )
        .scalar()
    ) or 0.0

    return max(released - already_drawn, 0.0)


@payouts_bp.route('/balance', methods=['GET'])
@jwt_required()
def payout_balance():
    current_user_id = int(get_jwt_identity())
    user = db.get_or_404(User, current_user_id)
    if user.role != 'farmer':
        return jsonify({'message': 'Access restricted. Only farmers have a payout balance.'}), 403
    return jsonify({
        'balance': round(withdrawable_balance(user.id), 2),
        'currency': 'KES',
    }), 200


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

    # Without this, any self-registered farmer can drain the B2C float: the only
    # check above was "amount > 0" and a Kenyan phone number.
    available = withdrawable_balance(current_user_id)
    if float(amount) > available:
        return jsonify({
            'message': 'Amount exceeds your available balance.',
            'available_balance': round(available, 2),
        }), 400

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

    # Create the payout record first with a 'pending' status so funds are tracked
    new_payout = Payout(
        farmer_id=current_user_id,
        amount=float(amount),
        mpesa_number=cleaned_phone,
        conversation_id=payout_ref,
        status='pending'
    )
    db.session.add(new_payout)
    db.session.flush()

    # Actually initiate the M-Pesa B2C payment
    token = get_mpesa_access_token()
    if token:
        env = os.getenv('MPESA_ENV', 'sandbox')
        base_url = (
            "https://sandbox.safaricom.co.ke" if env == "sandbox" else "https://api.safaricom.co.ke"
        )
        b2c_payload = {
            "OriginatorConversationID": payout_ref,
            "InitiatorName": os.getenv('MPESA_INITIATOR_NAME', ''),
            "SecurityCredential": base64.b64encode(
                f"{os.getenv('MPESA_INITIATOR_NAME', '')}{os.getenv('MPESA_PASSKEY', '')}".encode()
            ).decode('utf-8'),
            "CommandAPI": "BusinessPayment" if env == "sandbox" else os.getenv('MPESA_B2C_COMMAND', 'BusinessPayment'),
            "PartyA": cleaned_phone,
            "IdentifierType": "4",
            "Amount": int(float(amount)),
            "Remarks": f"Acreage Payout {payout_ref}",
            "QueueTimeOutURL": os.getenv('MPESA_CALLBACK_URL', ''),
            "ResultURL": os.getenv('MPESA_CALLBACK_URL', ''),
            "OCCIF": "1" if env == "production" else "0",
            "SpecialEnum": "0",
        }

        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        try:
            resp = requests.post(
                f"{base_url}/mpesa/b2c/v3/payment/register",
                json=b2c_payload,
                headers=headers,
                timeout=15,
            )
            if resp.status_code == 200:
                new_payout.status = 'completed'
                logger.info("M-Pesa B2C payout initiated",
                            extra={'payout_id': new_payout.id, 'farmer_id': current_user_id})
            else:
                logger.error("M-Pesa B2C payout rejected: %s", resp.text,
                             extra={'payout_id': new_payout.id, 'status_code': resp.status_code})
        except requests.RequestException:
            logger.exception("M-Pesa B2C payout request failed", extra={'payout_id': new_payout.id})
    else:
        logger.error("Could not obtain M-Pesa access token for payout", extra={'payout_id': new_payout.id})

    db.session.commit()

    return jsonify({
        'message': 'M-Pesa payout initiated successfully.',
        'transaction_reference': payout_ref,
        'amount': amount,
        'recipient': cleaned_phone,
        'status': new_payout.status
    }), 201


@payouts_bp.route('/history', methods=['GET'])
@jwt_required()
def get_payout_history():
    current_user_id = int(get_jwt_identity())
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)

    pagination = Payout.query.filter_by(farmer_id=current_user_id).order_by(
        Payout.created_at.desc()
    ).paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'items': [{
            'id': r.id,
            'amount': r.amount,
            'mpesa_number': r.mpesa_number,
            'reference': r.conversation_id,
            'status': r.status,
            'date': r.created_at.strftime('%b %d, %Y %I:%M %p')
        } for r in pagination.items],
        'total': pagination.total,
        'page': page,
        'pages': pagination.pages,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev,
    }), 200
