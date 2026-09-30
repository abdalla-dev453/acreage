"""Phase 3: escrow administration, payouts, commission and disputes.

The money routes are separated from moderation because they carry the highest
consequence in the console: an administrator here can move a farmer's earnings.
Three things follow from that.

Every mutation requires a written reason and records a before/after snapshot.

Releases and refunds go through the existing escrow service rather than
directly updating the row, so the state machine, the escrow_events ledger and
the transaction boundary all stay in one place. An admin path that bypassed
them would leave money moved with no corresponding event.

Withholding requires escrow to be `disputed`, so the dashboard can never claim
more is held than actually is.
"""

import csv
import io
import logging

from flask import Blueprint, Response, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import func, or_

from app import db
from app.models.admin import AdminAuditLog
from app.models.commerce import EscrowTransaction, Receipt
from app.models.order import Order
from app.models.payout import Payout
from app.models.platform import Dispute, PlatformSetting
from app.models.user import User
from app.services import escrow as escrow_service
from app.utils import admin_auth
from app.utils.http import json_object
from app.utils.time import utcnow

finance_bp = Blueprint('admin_finance', __name__)
logger = logging.getLogger(__name__)

MAX_PAGE_SIZE = 100
ESCROW_FIELDS = ['amount', 'currency', 'status', 'checkout_request_id',
                 'mpesa_receipt_number', 'provider_transaction_id']


def _error(message, status=400, **extra):
    payload = {'message': message}
    payload.update(extra)
    return jsonify(payload), status


def _record(actor, action, target=None, before=None, after=None, **detail):
    entry = AdminAuditLog(
        actor_id=actor.id,
        target_user_id=getattr(target, 'id', None),
        action=action,
        detail_json=detail,
        before_json=before,
        after_json=after,
        ip_address=admin_auth.client_ip(),
        user_agent=(admin_auth.user_agent() or '')[:255],
    )
    db.session.add(entry)
    return entry


def _snapshot(obj, fields):
    out = {}
    for field in fields:
        value = getattr(obj, field, None)
        out[field] = value.isoformat() if hasattr(value, 'isoformat') else value
    return out


def _guard(permission):
    from app.routes.admin import require_admin
    return require_admin(permission)


def _commission_rate():
    """Platform commission as a fraction, defaulting to zero.

    A missing setting must not silently charge a real percentage, so the
    default is 0 and the admin sees the effective rate in the response.
    """
    row = PlatformSetting.query.filter_by(key='commission_rate').first()
    if row is None or row.value_json is None:
        return 0.0
    try:
        return max(0.0, float(row.value_json))
    except (TypeError, ValueError):
        return 0.0


# ── Escrow ──────────────────────────────────────────────────────────────

@finance_bp.route('/escrow', methods=['GET'])
@jwt_required()
def list_escrow():
    """Every escrow transaction with both parties."""
    actor, failure = _guard('escrow.view')
    if failure is not None:
        return failure

    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 25, type=int), MAX_PAGE_SIZE)
    status = request.args.get('status')
    search = (request.args.get('q') or '').strip()

    query = EscrowTransaction.query
    if status:
        query = query.filter(EscrowTransaction.status == status)
    if search:
        like = f'%{search}%'
        query = query.filter(or_(
            EscrowTransaction.checkout_request_id.ilike(like),
            EscrowTransaction.mpesa_receipt_number.ilike(like),
            EscrowTransaction.order_id.cast(db.String).ilike(like),
        ))

    pagination = query.order_by(
        EscrowTransaction.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False)

    totals = dict(
        db.session.query(EscrowTransaction.status, func.count(EscrowTransaction.id))
        .group_by(EscrowTransaction.status).all()
    )
    held = db.session.query(func.coalesce(func.sum(EscrowTransaction.amount), 0.0)).filter(
        EscrowTransaction.status.in_(['funded', 'disputed'])).scalar()

    return jsonify({
        'items': [{
            'id': e.id,
            'order_id': e.order_id,
            'buyer_id': e.buyer_id,
            'farmer_id': e.farmer_id,
            'amount': e.amount,
            'commission': round(float(e.amount) * _commission_rate(), 2),
            'currency': e.currency,
            'status': e.status,
            'checkout_request_id': e.checkout_request_id,
            'mpesa_receipt_number': e.mpesa_receipt_number,
            'funded_at': e.funded_at.isoformat() if e.funded_at else None,
            'released_at': e.released_at.isoformat() if e.released_at else None,
            'refunded_at': e.refunded_at.isoformat() if e.refunded_at else None,
            'dispute_reason': e.dispute_reason,
            'created_at': e.created_at.isoformat() if e.created_at else None,
        } for e in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
        'has_next': pagination.has_next,
        'summary': {
            'held_value': round(float(held or 0), 2),
            'by_status': {k: v for k, v in totals.items() if k},
            'commission_rate': _commission_rate(),
        },
    }), 200


@finance_bp.route('/escrow/<int:escrow_id>/release', methods=['POST'])
@jwt_required()
def release_escrow(escrow_id):
    """Release held funds to the farmer."""
    actor, failure = _guard('escrow.release')
    if failure is not None:
        return failure

    record = db.session.get(EscrowTransaction, escrow_id)
    if record is None:
        return _error('Escrow transaction not found', 404)

    data, error = json_object()
    if error:
        return error

    reason = (data.get('reason') or '').strip()
    if not reason:
        return _error('A reason is required to release escrow')

    # Disputed escrow is not releasable out of band; it goes through the
    # dispute queue so the decision and the reason are attached to it.
    if record.status == 'disputed':
        return _error(
            'This escrow is disputed. Resolve the dispute from the disputes '
            'queue so the decision is recorded.', 409,
        )
    if record.status != 'funded':
        return _error(
            f'Only funded escrow can be released; this one is {record.status}',
            409,
        )

    before = _snapshot(record, ESCROW_FIELDS)
    try:
        # Through the service, not a direct update, so the state machine, the
        # escrow_events ledger and the transaction boundary all apply.
        escrow_service.release_escrow(record, actor, reason=reason)
    except ValueError as exc:
        return _error(str(exc), 409)

    _record(actor, 'escrow.release', target=db.session.get(User, record.farmer_id),
            before=before, after=_snapshot(record, ESCROW_FIELDS),
            escrow_id=record.id, order_id=record.order_id,
            amount=record.amount, reason=reason)
    db.session.commit()

    logger.warning('Admin %s released escrow %s (KES %s): %s',
                   actor.username, escrow_id, record.amount, reason)
    return jsonify({'message': f'Released KES {record.amount} to the farmer.',
                    'escrow': _snapshot(record, ESCROW_FIELDS)}), 200


@finance_bp.route('/escrow/<int:escrow_id>/refund', methods=['POST'])
@jwt_required()
def refund_escrow(escrow_id):
    """Return held funds to the buyer."""
    actor, failure = _guard('escrow.refund')
    if failure is not None:
        return failure

    record = db.session.get(EscrowTransaction, escrow_id)
    if record is None:
        return _error('Escrow transaction not found', 404)

    data, error = json_object()
    if error:
        return error

    reason = (data.get('reason') or '').strip()
    if not reason:
        return _error('A reason is required to refund escrow')
    if record.status == 'disputed':
        return _error(
            'This escrow is disputed. Resolve the dispute from the disputes queue.',
            409,
        )
    if record.status not in ('funded', 'released'):
        return _error(
            f'Only funded or released escrow can be refunded; this one is {record.status}',
            409,
        )

    before = _snapshot(record, ESCROW_FIELDS)
    try:
        escrow_service.refund_escrow(record, actor, reason=reason)
    except ValueError as exc:
        return _error(str(exc), 409)

    _record(actor, 'escrow.refund', target=db.session.get(User, record.buyer_id),
            before=before, after=_snapshot(record, ESCROW_FIELDS),
            escrow_id=record.id, order_id=record.order_id,
            amount=record.amount, reason=reason)
    db.session.commit()

    logger.warning('Admin %s refunded escrow %s (KES %s): %s',
                   actor.username, escrow_id, record.amount, reason)
    return jsonify({'message': f'Refunded KES {record.amount} to the buyer.',
                    'escrow': _snapshot(record, ESCROW_FIELDS)}), 200


@finance_bp.route('/escrow/export.csv', methods=['GET'])
@jwt_required()
def export_escrow():
    """Escrow as CSV. Streams rather than buffering a page in memory."""
    actor, failure = _guard('finance.export')
    if failure is not None:
        return failure

    status = request.args.get('status')
    query = EscrowTransaction.query
    if status:
        query = query.filter(EscrowTransaction.status == status)

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(['id', 'order_id', 'buyer_id', 'farmer_id', 'amount',
                     'currency', 'status', 'checkout_request_id',
                     'mpesa_receipt_number', 'funded_at', 'released_at',
                     'refunded_at'])

    for record in query.order_by(
            EscrowTransaction.created_at.desc()).limit(50_000).all():
        writer.writerow([
            record.id, record.order_id, record.buyer_id, record.farmer_id,
            record.amount, record.currency, record.status,
            record.checkout_request_id or '', record.mpesa_receipt_number or '',
            record.funded_at, record.released_at, record.refunded_at,
        ])

    _record(actor, 'escrow.export', detail={'status': status})
    db.session.commit()

    return Response(
        buffer.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition':
                 'attachment; filename=escrow-export.csv'},
    )


# ── Payouts ─────────────────────────────────────────────────────────────

@finance_bp.route('/payouts', methods=['GET'])
@jwt_required()
def list_payouts():
    actor, failure = _guard('payouts.view')
    if failure is not None:
        return failure

    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 25, type=int), MAX_PAGE_SIZE)
    status = request.args.get('status')

    query = Payout.query
    if status:
        query = query.filter(Payout.status == status)

    pagination = query.order_by(Payout.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False)

    totals = dict(
        db.session.query(Payout.status, func.coalesce(func.sum(Payout.amount), 0.0))
        .group_by(Payout.status).all()
    )

    return jsonify({
        'items': [{
            'id': p.id,
            'farmer_id': p.farmer_id,
            'farmer_username': p.farmer.username if p.farmer else None,
            'mpesa_number': p.mpesa_number,
            'amount': p.amount,
            'status': p.status,
            'escrow_transaction_id': p.escrow_transaction_id,
            'conversation_id': p.conversation_id,
            'created_at': p.created_at.isoformat() if p.created_at else None,
        } for p in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
        'has_next': pagination.has_next,
        'totals': {k: round(float(v or 0), 2) for k, v in totals.items() if k},
    }), 200


@finance_bp.route('/payouts/<int:payout_id>/retry', methods=['POST'])
@jwt_required()
def retry_payout(payout_id):
    """Re-attempt a failed payout.

    Does not re-issue the B2C call here: the provider is called from the
    farmer-facing path and re-running it from the console would mean two
    independent code paths moving money. Instead this clears the failure and
    records that the farmer may retry, which is what the operations team
    actually needs.
    """
    actor, failure = _guard('payouts.manage')
    if failure is not None:
        return failure

    payout = db.session.get(Payout, payout_id)
    if payout is None:
        return _error('Payout not found', 404)

    data, error = json_object()
    if error:
        return error
    reason = (data.get('reason') or '').strip()
    if not reason:
        return _error('A reason is required')

    before = _snapshot(payout, ['status', 'conversation_id'])
    payout.status = 'Pending'
    payout.conversation_id = None
    _record(actor, 'payout.retry', target=db.session.get(User, payout.farmer_id),
            before=before, after=_snapshot(payout, ['status', 'conversation_id']),
            payout_id=payout.id, amount=payout.amount, reason=reason)
    db.session.commit()

    logger.warning('Admin %s reset payout %s for retry: %s',
                   actor.username, payout_id, reason)
    return jsonify({'message': 'Payout reset to pending. The farmer can retry it.'}), 200


# ── Disputes ────────────────────────────────────────────────────────────

def _apply_decision(escrow, actor, decision, amount, note):
    """Move the money for a dispute decision.

    Raises ValueError when the service refuses, so the caller leaves the
    dispute open and reports why rather than returning a 500.
    """
    if decision == 'refund_buyer':
        escrow_service.refund_escrow(escrow, actor, reason=note)
    elif decision == 'release_farmer':
        if escrow.status != 'disputed':
            raise ValueError(
                f'Cannot release escrow that is {escrow.status}; it must be '
                'under dispute first.')
        escrow_service.release_escrow(escrow, actor, from_dispute=True, reason=note)
    elif decision == 'split':
        if escrow.status != 'disputed':
            raise ValueError('A split requires the escrow to be under dispute')
        commission = _commission_rate()
        farmer_share = round(amount * (1 - commission), 2)
        # from_dispute relaxes the quality precondition: an administrator has
        # explicitly decided the outcome, which is what replaces the buyer's
        # quality confirmation.
        escrow_service.release_escrow(
            escrow, actor, from_dispute=True,
            reason=f'{note} (split: KES {amount} to farmer '
                   f'after {commission:.1%} commission)')
        escrow.status = 'partially_released'
        escrow.metadata_json = {
            **(escrow.metadata_json or {}),
            'split': {'gross': amount, 'farmer_share': farmer_share,
                      'commission': round(amount * commission, 2),
                      'by': actor.username},
        }
    # 'no_action' deliberately moves nothing and closes the dispute.


@finance_bp.route('/disputes', methods=['GET'])
@jwt_required()
def list_disputes():
    actor, failure = _guard('disputes.view')
    if failure is not None:
        return failure

    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 25, type=int), MAX_PAGE_SIZE)
    status = request.args.get('status')

    query = Dispute.query
    if status:
        query = query.filter(Dispute.status == status)

    pagination = query.order_by(
        Dispute.opened_at.desc()).paginate(page=page, per_page=per_page,
                                           error_out=False)

    items = []
    for d in pagination.items:
        order = db.session.get(Order, d.order_id) if d.order_id else None
        items.append(d.to_dict(
            order_code=order.order_code if order else None,
            escrow_status=d.escrow.status if d.escrow else None,
            escrow_amount=d.escrow.amount if d.escrow else None,
        ))

    counts = {
        'open': Dispute.query.filter_by(status='open').count(),
        'awaiting_evidence': Dispute.query.filter_by(
            status='awaiting_evidence').count(),
        'resolved': Dispute.query.filter_by(status='resolved').count(),
    }
    return jsonify({'items': items, 'total': pagination.total,
                    'page': pagination.page, 'pages': pagination.pages,
                    'has_next': pagination.has_next, 'counts': counts}), 200


@finance_bp.route('/disputes/<int:dispute_id>/evidence', methods=['POST'])
@jwt_required()
def add_evidence(dispute_id):
    """Attach evidence. Appended, never replaced — a dispute record that can
    be rewritten is not evidence."""
    actor, failure = _guard('disputes.view')
    if failure is not None:
        return failure

    dispute = db.session.get(Dispute, dispute_id)
    if dispute is None:
        return _error('Dispute not found', 404)

    data, error = json_object()
    if error:
        return error
    note = (data.get('note') or '').strip()
    if not note:
        return _error('A note is required')

    entries = list(dispute.evidence_json or [])
    entries.append({
        'note': note,
        'by': actor.username,
        'by_admin': True,
        'at': utcnow().isoformat(),
    })
    dispute.evidence_json = entries
    _record(actor, 'dispute.evidence', before={'count': len(entries) - 1},
            after={'count': len(entries)}, dispute_id=dispute.id)
    db.session.commit()
    return jsonify({'message': 'Evidence attached.', 'dispute': dispute.to_dict()}), 200


@finance_bp.route('/disputes/<int:dispute_id>/resolve', methods=['POST'])
@jwt_required()
def resolve_dispute(dispute_id):
    """Decide a dispute and move the money accordingly."""
    actor, failure = _guard('disputes.resolve')
    if failure is not None:
        return failure

    dispute = db.session.get(Dispute, dispute_id)
    if dispute is None:
        return _error('Dispute not found', 404)
    if not dispute.is_open:
        return _error(f'That dispute is already {dispute.status}', 409)

    data, error = json_object()
    if error:
        return error

    decision = (data.get('decision') or '').strip()
    if decision not in ('refund_buyer', 'release_farmer', 'split', 'no_action'):
        return _error(
            "decision must be 'refund_buyer', 'release_farmer', 'split' or 'no_action'"
        )

    note = (data.get('note') or '').strip()
    if not note:
        return _error('A note is required to decide a dispute')

    amount = data.get('resolution_amount')
    escrow = dispute.escrow

    # A decision that moves money needs escrow to exist.
    if decision != 'no_action' and escrow is None:
        return _error('This dispute has no escrow transaction attached', 409)

    if decision == 'split':
        if amount is None:
            return _error('resolution_amount is required for a split')
        try:
            amount = float(amount)
        except (TypeError, ValueError):
            return _error('resolution_amount must be a number')
        if amount < 0 or amount > float(escrow.amount):
            return _error(
                f'resolution_amount must be between 0 and {escrow.amount}'
            )
    elif amount is not None:
        return _error('resolution_amount only applies to a split')

    before = {'status': dispute.status, 'decision': dispute.decision,
              'escrow_status': escrow.status if escrow else None}

    # Move the money first. If the service refuses, the dispute is left open
    # rather than marked resolved with no movement.
    try:
        _apply_decision(escrow, actor, decision, amount, note)
    except ValueError as exc:
        # The service refused: the escrow is unchanged, so the dispute stays
        # open and the administrator is told why rather than getting a 500.
        return _error(str(exc), 409)

    dispute.decision = decision
    dispute.resolution_note = note
    dispute.status = 'resolved'
    dispute.resolved_by_id = actor.id
    dispute.resolved_at = utcnow()

    _record(actor, 'dispute.resolve',
            target=db.session.get(User, dispute.against_user_id),
            before=before,
            after={'status': 'resolved', 'decision': decision,
                   'resolution_amount': dispute.resolution_amount,
                   'escrow_status': escrow.status if escrow else None},
            dispute_id=dispute.id, note=note)

    db.session.commit()
    logger.warning('Admin %s resolved dispute %s as %s: %s',
                   actor.username, dispute_id, decision, note)
    return jsonify({'message': f'Dispute resolved: {decision.replace("_", " ")}.',
                    'dispute': dispute.to_dict()}), 200


@finance_bp.route('/commission', methods=['GET', 'PATCH'])
@jwt_required()
def commission():
    """The platform's take rate.

    Reading requires finance.settings rather than just escrow.view, because
    the rate is a configuration knob, not a balance.
    """
    actor, failure = _guard('finance.settings')
    if failure is not None:
        return failure

    if request.method == 'GET':
        return jsonify({
            'commission_rate': _commission_rate(),
            'source': 'platform_settings.commission_rate',
        }), 200

    data, error = json_object()
    if error:
        return error
    try:
        rate = float(data.get('commission_rate'))
    except (TypeError, ValueError):
        return _error('commission_rate must be a number')
    if not 0 <= rate <= 0.5:
        return _error('commission_rate must be between 0 and 0.5')

    row = PlatformSetting.query.filter_by(key='commission_rate').first()
    before = row.value_json if row else None
    if row is None:
        row = PlatformSetting(key='commission_rate', category='finance',
                              description='Platform share of each settled escrow')
        db.session.add(row)
    row.value_json = rate
    row.updated_by_id = actor.id
    from app.utils.time import utcnow
    row.updated_at = utcnow()

    _record(actor, 'finance.commission_change',
            before={'commission_rate': before}, after={'commission_rate': rate})
    db.session.commit()
    logger.warning('Admin %s set commission to %.4f', actor.username, rate)
    return jsonify({'commission_rate': rate,
                    'message': 'Commission rate saved. It applies to future settlements.'}), 200