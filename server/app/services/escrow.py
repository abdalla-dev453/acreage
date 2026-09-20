from app import db
from app.models.commerce import EscrowEvent, EscrowTransaction
from app.models.order import Order
from app.models.user import User
from app.utils.time import utcnow


ESCROW_FINAL_STATES = {'released', 'refunded'}


def get_or_create_escrow(order):
    existing = getattr(order, 'escrow_transaction', None)
    if existing:
        return existing
    escrow = EscrowTransaction(
        order=order,
        buyer_id=order.buyer_id,
        farmer_id=order.farmer_id,
        amount=order.total_amount,
        currency='KES',
        provider='mpesa',
        status='pending',
    )
    db.session.add(escrow)
    db.session.flush()
    return escrow


def add_event(escrow, actor, event_type, amount=None, metadata=None):
    event = EscrowEvent(
        escrow_transaction=escrow,
        actor=actor,
        event_type=event_type,
        amount=amount,
        metadata_json=metadata or {},
    )
    db.session.add(event)
    return event


def fund_escrow(escrow, actor, provider_transaction_id=None, mpesa_receipt_number=None):
    if escrow.status not in {'pending', 'payment_started'}:
        return escrow
    escrow.status = 'funded'
    escrow.provider_transaction_id = provider_transaction_id or escrow.provider_transaction_id
    escrow.mpesa_receipt_number = mpesa_receipt_number or escrow.mpesa_receipt_number
    escrow.funded_at = escrow.funded_at or utcnow()
    add_event(escrow, actor, 'funded', escrow.amount)
    return escrow


def confirm_quality(escrow, actor):
    if escrow.status != 'funded':
        raise ValueError('Escrow must be funded before quality confirmation')
    if actor.id != escrow.order.buyer_id:
        raise PermissionError('Only the buyer can confirm quality')
    escrow.order.quality_status = 'confirmed'
    add_event(escrow, actor, 'quality_confirmed')
    return escrow


def release_escrow(escrow, actor):
    if escrow.status != 'funded' or escrow.order.quality_status != 'confirmed':
        raise ValueError('Quality must be confirmed before release')
    if actor.id != escrow.farmer_id and actor.role != 'admin':
        raise PermissionError('Only the farmer or an admin can release escrow')
    escrow.status = 'released'
    escrow.released_at = utcnow()
    add_event(escrow, actor, 'released', escrow.amount)
    return escrow


def dispute_escrow(escrow, actor, reason):
    if not reason or not reason.strip():
        raise ValueError('A dispute reason is required')
    if actor.id not in {escrow.buyer_id, escrow.farmer_id} and actor.role != 'admin':
        raise PermissionError('Only order participants can open a dispute')
    if escrow.status in ESCROW_FINAL_STATES:
        raise ValueError('Finalized escrow cannot be disputed')
    escrow.status = 'disputed'
    escrow.dispute_reason = reason.strip()
    add_event(escrow, actor, 'disputed', metadata={'reason': reason.strip()})
    return escrow


def refund_escrow(escrow, actor):
    if escrow.status not in {'funded', 'disputed'}:
        raise ValueError('Only funded or disputed escrow can be refunded')
    if actor.role != 'admin':
        raise PermissionError('Only an admin can refund escrow')
    escrow.status = 'refunded'
    escrow.refunded_at = utcnow()
    add_event(escrow, actor, 'refunded', escrow.amount)
    return escrow


def escrow_for_order(order_id):
    order = db.session.get(Order, order_id)
    if not order:
        return None
    return get_or_create_escrow(order)


def user_can_view(actor, escrow):
    return actor.role == 'admin' or actor.id in {escrow.buyer_id, escrow.farmer_id}
