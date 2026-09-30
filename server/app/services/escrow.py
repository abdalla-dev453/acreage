from app import db
from app.models.commerce import EscrowEvent, EscrowTransaction
from app.models.order import Order
from app.models.product import Product
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


def release_reserved_stock(order, escrow=None):
    """Restore an order reservation exactly once."""
    escrow = escrow or getattr(order, 'escrow_transaction', None)
    metadata = dict(escrow.metadata_json or {}) if escrow else {}
    if metadata.get('stock_released'):
        return False

    for item in order.items:
        product = db.session.get(Product, item.product_id)
        if product:
            product.stock_quantity += item.quantity
    if escrow:
        metadata['stock_released'] = True
        escrow.metadata_json = metadata
    return True


def cancel_unpaid_order(order, escrow=None, failed=False):
    """Cancel an unpaid order and release its reservation exactly once."""
    if order.payment_status == 'paid' or escrow and escrow.status == 'funded':
        return False

    escrow = escrow or getattr(order, 'escrow_transaction', None)
    release_reserved_stock(order, escrow)
    order.payment_status = 'failed' if failed else order.payment_status
    order.status = 'cancelled'
    if escrow:
        escrow.status = 'failed' if failed else 'cancelled'
    return True


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


def release_escrow(escrow, actor, reason=None, from_dispute=False):
    """Release held funds to the farmer.

    The quality precondition is relaxed only when `from_dispute` is set, which
    the dispute resolution path passes after an administrator has explicitly
    decided the outcome. Going through this function rather than updating the
    row directly is what keeps the state machine and the escrow_events ledger
    in agreement; a console that moved money around it would leave the two
    permanently out of step.
    """
    if from_dispute:
        if escrow.status not in ('disputed', 'funded'):
            raise ValueError(
                f'Only disputed or funded escrow can be released from a '
                f'dispute decision; this one is {escrow.status}'
            )
    elif escrow.status != 'funded' or escrow.order.quality_status != 'confirmed':
        raise ValueError('Quality must be confirmed before release')
    if actor.id != escrow.farmer_id and not actor.is_privileged:
        raise PermissionError('Only the farmer or an admin can release escrow')
    escrow.status = 'released'
    escrow.released_at = utcnow()
    add_event(escrow, actor, 'released', escrow.amount,
              metadata={'reason': reason} if reason else None)
    return escrow


def dispute_escrow(escrow, actor, reason):
    if not reason or not reason.strip():
        raise ValueError('A dispute reason is required')
    if actor.id not in {escrow.buyer_id, escrow.farmer_id} and not actor.is_privileged:
        raise PermissionError('Only order participants can open a dispute')
    if escrow.status in ESCROW_FINAL_STATES:
        raise ValueError('Finalized escrow cannot be disputed')
    escrow.status = 'disputed'
    escrow.dispute_reason = reason.strip()
    add_event(escrow, actor, 'disputed', metadata={'reason': reason.strip()})
    return escrow


def refund_escrow(escrow, actor, reason=None):
    """Return held funds to the buyer."""
    if escrow.status not in {'funded', 'disputed'}:
        raise ValueError('Only funded or disputed escrow can be refunded')
    if not actor.is_privileged:
        raise PermissionError('Only an admin can refund escrow')
    escrow.status = 'refunded'
    escrow.refunded_at = utcnow()
    add_event(escrow, actor, 'refunded', escrow.amount,
              metadata={'reason': reason} if reason else None)
    return escrow


def escrow_for_order(order_id):
    order = db.session.get(Order, order_id)
    if not order:
        return None
    return get_or_create_escrow(order)


def user_can_view(actor, escrow):
    return actor.is_privileged or actor.id in {escrow.buyer_id, escrow.farmer_id}
