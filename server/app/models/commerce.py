from app import db
from app.utils.time import utcnow
from sqlalchemy import UniqueConstraint


class EscrowTransaction(db.Model):
    __tablename__ = 'escrow_transactions'
    __table_args__ = (
        UniqueConstraint('checkout_request_id', name='uq_escrow_checkout_request_id'),
        UniqueConstraint('mpesa_receipt_number', name='uq_escrow_mpesa_receipt'),
    )

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False, unique=True)
    buyer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    farmer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(3), nullable=False, default='KES')
    status = db.Column(db.String(30), nullable=False, default='pending')
    provider = db.Column(db.String(30), nullable=False, default='mpesa')
    provider_transaction_id = db.Column(db.String(100), nullable=True)
    checkout_request_id = db.Column(db.String(100), nullable=True)
    mpesa_receipt_number = db.Column(db.String(100), nullable=True)
    funded_at = db.Column(db.DateTime, nullable=True)
    release_requested_at = db.Column(db.DateTime, nullable=True)
    released_at = db.Column(db.DateTime, nullable=True)
    refunded_at = db.Column(db.DateTime, nullable=True)
    dispute_reason = db.Column(db.Text, nullable=True)
    metadata_json = db.Column(db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    order = db.relationship('Order', backref=db.backref('escrow_transaction', uselist=False))
    payout = db.relationship('Payout', back_populates='escrow_transaction', uselist=False)

    def to_dict(self):
        return {
            'id': self.id,
            'order_id': self.order_id,
            'buyer_id': self.buyer_id,
            'farmer_id': self.farmer_id,
            'amount': self.amount,
            'currency': self.currency,
            'status': self.status,
            'provider': self.provider,
            'provider_transaction_id': self.provider_transaction_id,
            'checkout_request_id': self.checkout_request_id,
            'mpesa_receipt_number': self.mpesa_receipt_number,
            'funded_at': self.funded_at.isoformat() if self.funded_at else None,
            'release_requested_at': self.release_requested_at.isoformat() if self.release_requested_at else None,
            'released_at': self.released_at.isoformat() if self.released_at else None,
            'refunded_at': self.refunded_at.isoformat() if self.refunded_at else None,
            'dispute_reason': self.dispute_reason,
            'metadata': self.metadata_json or {},
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class EscrowEvent(db.Model):
    __tablename__ = 'escrow_events'

    id = db.Column(db.Integer, primary_key=True)
    escrow_transaction_id = db.Column(db.Integer, db.ForeignKey('escrow_transactions.id'), nullable=False)
    actor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    event_type = db.Column(db.String(40), nullable=False)
    amount = db.Column(db.Float, nullable=True)
    metadata_json = db.Column(db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime, default=utcnow)

    escrow_transaction = db.relationship('EscrowTransaction', backref='events')
    actor = db.relationship('User', backref='escrow_events')

    def to_dict(self):
        return {
            'id': self.id,
            'escrow_transaction_id': self.escrow_transaction_id,
            'actor_id': self.actor_id,
            'event_type': self.event_type,
            'amount': self.amount,
            'metadata': self.metadata_json or {},
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class TransportQuote(db.Model):
    __tablename__ = 'transport_quotes'

    id = db.Column(db.Integer, primary_key=True)
    provider = db.Column(db.String(40), nullable=False)
    provider_quote_id = db.Column(db.String(100), nullable=True, unique=True)
    origin = db.Column(db.String(255), nullable=False)
    destination = db.Column(db.String(255), nullable=False)
    weight_kg = db.Column(db.Float, nullable=False)
    package_count = db.Column(db.Integer, nullable=False, default=1)
    mode = db.Column(db.String(30), nullable=False)
    carrier = db.Column(db.String(100), nullable=True)
    cost = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(3), nullable=False, default='KES')
    eta_minutes = db.Column(db.Integer, nullable=True)
    expires_at = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(20), nullable=False, default='quoted')
    metadata_json = db.Column(db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime, default=utcnow)


    def to_dict(self):
        return {
            'id': self.id,
            'provider': self.provider,
            'provider_quote_id': self.provider_quote_id,
            'origin': self.origin,
            'destination': self.destination,
            'weight_kg': self.weight_kg,
            'package_count': self.package_count,
            'mode': self.mode,
            'carrier': self.carrier,
            'cost': self.cost,
            'currency': self.currency,
            'eta_minutes': self.eta_minutes,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'status': self.status,
            'metadata': self.metadata_json or {},
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class SmsCommand(db.Model):
    __tablename__ = 'sms_commands'

    id = db.Column(db.Integer, primary_key=True)
    provider = db.Column(db.String(40), nullable=False)
    direction = db.Column(db.String(10), nullable=False, default='inbound')
    phone = db.Column(db.String(20), nullable=False)
    command = db.Column(db.Text, nullable=False)
    normalized_command = db.Column(db.String(255), nullable=False)
    idempotency_key = db.Column(db.String(100), nullable=False, unique=True)
    raw_payload = db.Column(db.JSON, nullable=False, default=dict)
    status = db.Column(db.String(20), nullable=False, default='received')
    error_message = db.Column(db.Text, nullable=True)
    received_at = db.Column(db.DateTime, nullable=False)
    processed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


    def to_dict(self):
        return {
            'id': self.id,
            'provider': self.provider,
            'direction': self.direction,
            'phone': self.phone,
            'command': self.command,
            'normalized_command': self.normalized_command,
            'idempotency_key': self.idempotency_key,
            'status': self.status,
            'error_message': self.error_message,
            'received_at': self.received_at.isoformat() if self.received_at else None,
            'processed_at': self.processed_at.isoformat() if self.processed_at else None,
            'raw_payload': self.raw_payload or {},
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class MarketPriceObservation(db.Model):
    __tablename__ = 'market_price_observations'

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=True)
    category = db.Column(db.String(80), nullable=True)
    market = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(255), nullable=True)
    price_per_unit = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(20), nullable=False, default='kg')
    currency = db.Column(db.String(3), nullable=False, default='KES')
    source = db.Column(db.String(100), nullable=False)
    provider = db.Column(db.String(40), nullable=False)
    observed_at = db.Column(db.DateTime, nullable=False)
    freshness_minutes = db.Column(db.Integer, nullable=False, default=60)
    is_current = db.Column(db.Boolean, nullable=False, default=True)
    metadata_json = db.Column(db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime, default=utcnow)

    product = db.relationship('Product', backref='market_price_observations')

    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'category': self.category,
            'market': self.market,
            'location': self.location,
            'price_per_unit': self.price_per_unit,
            'unit': self.unit,
            'currency': self.currency,
            'source': self.source,
            'provider': self.provider,
            'observed_at': self.observed_at.isoformat() if self.observed_at else None,
            'freshness_minutes': self.freshness_minutes,
            'is_current': self.is_current,
            'metadata': self.metadata_json or {},
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }



class GroupOrder(db.Model):
    __tablename__ = 'group_orders'

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    farmer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=True)
    target_quantity = db.Column(db.Float, nullable=False)
    min_quantity = db.Column(db.Float, nullable=False)
    committed_quantity = db.Column(db.Float, nullable=False, default=0.0)
    unit = db.Column(db.String(20), nullable=False, default='kg')
    price_per_unit = db.Column(db.Float, nullable=False)
    deposit_percent = db.Column(db.Float, nullable=False, default=0.0)
    deadline = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20), nullable=False, default='open')
    delivery_location = db.Column(db.String(255), nullable=True)
    transport_mode = db.Column(db.String(30), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    product = db.relationship('Product', back_populates='group_orders')
    farmer = db.relationship('User', backref='created_group_orders')
    commitments = db.relationship('GroupOrderCommitment', back_populates='group_order', cascade='all, delete-orphan', lazy='selectin')
    orders = db.relationship('Order', back_populates='group_order', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'farmer_id': self.farmer_id,
            'title': self.title,
            'description': self.description,
            'target_quantity': self.target_quantity,
            'min_quantity': self.min_quantity,
            'committed_quantity': self.committed_quantity,
            'unit': self.unit,
            'price_per_unit': self.price_per_unit,
            'deposit_percent': self.deposit_percent,
            'deadline': self.deadline.isoformat() if self.deadline else None,
            'status': self.status,
            'delivery_location': self.delivery_location,
            'transport_mode': self.transport_mode,
            'progress_percent': round(min(100.0, (self.committed_quantity / self.target_quantity) * 100), 1) if self.target_quantity else 0.0,
            'product': None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class GroupOrderCommitment(db.Model):
    __tablename__ = 'group_order_commitments'
    __table_args__ = (UniqueConstraint('group_order_id', 'buyer_id', name='uq_group_order_buyer'),)

    id = db.Column(db.Integer, primary_key=True)
    group_order_id = db.Column(db.Integer, db.ForeignKey('group_orders.id'), nullable=False)
    buyer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    quantity = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), nullable=False, default='pending')
    amount = db.Column(db.Float, nullable=False, default=0.0)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    group_order = db.relationship('GroupOrder', back_populates='commitments')
    buyer = db.relationship('User', backref='group_commitments')
    order = db.relationship('Order', backref='group_commitment', uselist=False)

    def to_dict(self):
        return {
            'id': self.id,
            'group_order_id': self.group_order_id,
            'buyer_id': self.buyer_id,
            'quantity': self.quantity,
            'status': self.status,
            'amount': self.amount,
            'order_id': self.order_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class HarvestPlan(db.Model):
    __tablename__ = 'harvest_plans'

    id = db.Column(db.Integer, primary_key=True)
    farmer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=True)
    field_name = db.Column(db.String(100), nullable=False)
    crop_name = db.Column(db.String(100), nullable=False)
    planting_date = db.Column(db.Date, nullable=True)
    harvest_start = db.Column(db.Date, nullable=False)
    harvest_end = db.Column(db.Date, nullable=True)
    expected_quantity = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(20), nullable=False, default='kg')
    unit_weight_kg = db.Column(db.Float, nullable=True)
    price_per_unit = db.Column(db.Float, nullable=True)
    status = db.Column(db.String(20), nullable=False, default='planned')
    visibility = db.Column(db.String(20), nullable=False, default='buyers')
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    farmer = db.relationship('User', backref='harvest_plans')
    product = db.relationship('Product', back_populates='harvest_plans')
    preorders = db.relationship('HarvestPreorder', back_populates='harvest_plan', cascade='all, delete-orphan', lazy='selectin')

    def to_dict(self):
        return {
            'id': self.id,
            'farmer_id': self.farmer_id,
            'product_id': self.product_id,
            'product': None,
            'field_name': self.field_name,
            'crop_name': self.crop_name,
            'planting_date': self.planting_date.isoformat() if self.planting_date else None,
            'harvest_start': self.harvest_start.isoformat() if self.harvest_start else None,
            'harvest_end': self.harvest_end.isoformat() if self.harvest_end else None,
            'expected_quantity': self.expected_quantity,
            'unit': self.unit,
            'unit_weight_kg': self.unit_weight_kg,
            'price_per_unit': self.price_per_unit,
            'status': self.status,
            'visibility': self.visibility,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class HarvestPreorder(db.Model):
    __tablename__ = 'harvest_preorders'
    __table_args__ = (UniqueConstraint('harvest_plan_id', 'buyer_id', name='uq_harvest_preorder_buyer'),)

    id = db.Column(db.Integer, primary_key=True)
    harvest_plan_id = db.Column(db.Integer, db.ForeignKey('harvest_plans.id'), nullable=False)
    buyer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    quantity = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(20), nullable=False, default='kg')
    deposit_amount = db.Column(db.Float, nullable=False, default=0.0)
    status = db.Column(db.String(20), nullable=False, default='pending')
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    harvest_plan = db.relationship('HarvestPlan', back_populates='preorders')
    buyer = db.relationship('User', backref='harvest_preorders')

    def to_dict(self):
        return {
            'id': self.id,
            'harvest_plan_id': self.harvest_plan_id,
            'buyer_id': self.buyer_id,
            'quantity': self.quantity,
            'unit': self.unit,
            'deposit_amount': self.deposit_amount,
            'status': self.status,
            'order_id': None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class Receipt(db.Model):
    __tablename__ = 'receipts'

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False, unique=True)
    receipt_number = db.Column(db.String(40), nullable=False, unique=True)
    buyer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    farmer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    currency = db.Column(db.String(3), nullable=False, default='KES')
    subtotal = db.Column(db.Float, nullable=False)
    transport_cost = db.Column(db.Float, nullable=False, default=0.0)
    processing_fee = db.Column(db.Float, nullable=False, default=0.0)
    discount = db.Column(db.Float, nullable=False, default=0.0)
    total_amount = db.Column(db.Float, nullable=False)
    payment_reference = db.Column(db.String(100), nullable=True)
    escrow_transaction_id = db.Column(db.Integer, db.ForeignKey('escrow_transactions.id'), nullable=True)
    status = db.Column(db.String(20), nullable=False, default='issued')
    snapshot_json = db.Column(db.JSON, nullable=False, default=dict)
    issued_at = db.Column(db.DateTime, default=utcnow)

    order = db.relationship('Order', backref=db.backref('receipt', uselist=False))
    buyer = db.relationship('User', foreign_keys=[buyer_id], backref='receipts')
    farmer = db.relationship('User', foreign_keys=[farmer_id], backref='issued_receipts')
    escrow_transaction = db.relationship('EscrowTransaction', backref='receipts')

    def to_dict(self):
        return {
            'id': self.id,
            'order_id': self.order_id,
            'receipt_number': self.receipt_number,
            'buyer_id': self.buyer_id,
            'farmer_id': self.farmer_id,
            'currency': self.currency,
            'subtotal': self.subtotal,
            'transport_cost': self.transport_cost,
            'processing_fee': self.processing_fee,
            'discount': self.discount,
            'total_amount': self.total_amount,
            'payment_reference': self.payment_reference,
            'escrow_transaction_id': self.escrow_transaction_id,
            'status': self.status,
            'snapshot': self.snapshot_json or {},
            'issued_at': self.issued_at.isoformat() if self.issued_at else None,
        }
