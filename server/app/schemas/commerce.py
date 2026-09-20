from app import ma
from marshmallow import fields
from app.models.commerce import (
    EscrowTransaction,
    EscrowEvent,
    TransportQuote,
    SmsCommand,
    MarketPriceObservation,
    GroupOrder,
    GroupOrderCommitment,
    HarvestPlan,
    HarvestPreorder,
    Receipt,
)


class EscrowEventSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = EscrowEvent
        include_fk = True
        dump_only = ('id', 'created_at')


class EscrowTransactionSchema(ma.SQLAlchemyAutoSchema):
    metadata = fields.Raw(attribute='metadata_json')
    events = ma.Nested(EscrowEventSchema, many=True, dump_only=True)

    class Meta:
        model = EscrowTransaction
        include_fk = True
        fields = (
            'id', 'order_id', 'buyer_id', 'farmer_id', 'amount', 'currency',
            'status', 'provider', 'provider_transaction_id', 'checkout_request_id',
            'mpesa_receipt_number', 'funded_at', 'release_requested_at', 'released_at',
            'refunded_at', 'dispute_reason', 'metadata', 'created_at', 'updated_at', 'events',
        )
        dump_only = ('id', 'created_at', 'updated_at', 'events')


class TransportQuoteSchema(ma.SQLAlchemyAutoSchema):
    metadata = fields.Raw(attribute='metadata_json')

    class Meta:
        model = TransportQuote
        include_fk = True
        fields = (
            'id', 'provider', 'provider_quote_id', 'origin', 'destination',
            'weight_kg', 'package_count', 'mode', 'carrier', 'cost', 'currency',
            'eta_minutes', 'expires_at', 'status', 'metadata', 'created_at',
        )
        dump_only = ('id', 'created_at')


class SmsCommandSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = SmsCommand
        include_fk = True
        fields = (
            'id', 'provider', 'direction', 'phone', 'command', 'normalized_command',
            'idempotency_key', 'status', 'error_message', 'received_at', 'processed_at',
            'raw_payload', 'created_at',
        )
        dump_only = ('id', 'created_at')


class MarketPriceObservationSchema(ma.SQLAlchemyAutoSchema):
    metadata = fields.Raw(attribute='metadata_json')
    price_change_percent = fields.Method('get_price_change_percent', dump_only=True)

    def get_price_change_percent(self, obj):
        previous = MarketPriceObservation.query.filter(
            MarketPriceObservation.product_id == obj.product_id if obj.product_id else True,
            MarketPriceObservation.category == obj.category if obj.category else True,
            MarketPriceObservation.market == obj.market,
            MarketPriceObservation.id < obj.id,
        ).order_by(MarketPriceObservation.observed_at.desc()).first()
        if not previous or previous.price_per_unit == 0:
            return None
        return round(((obj.price_per_unit - previous.price_per_unit) / previous.price_per_unit) * 100, 1)

    class Meta:
        model = MarketPriceObservation
        include_fk = True
        fields = (
            'id', 'product_id', 'category', 'market', 'location', 'price_per_unit',
            'unit', 'currency', 'source', 'provider', 'observed_at',
            'freshness_minutes', 'is_current', 'price_change_percent', 'metadata', 'created_at',
        )
        dump_only = ('id', 'created_at')


class GroupOrderCommitmentSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = GroupOrderCommitment
        include_fk = True
        fields = ('id', 'group_order_id', 'buyer_id', 'quantity', 'status', 'amount', 'order_id', 'created_at', 'updated_at')
        dump_only = ('id', 'created_at', 'updated_at')


class GroupOrderSchema(ma.SQLAlchemyAutoSchema):
    commitments = ma.Nested(GroupOrderCommitmentSchema, many=True, dump_only=True)
    product = ma.Nested('app.schemas.product.ProductSchema', only=('id', 'title', 'unit', 'price_per_unit', 'image_url', 'is_premium', 'quality_score'), dump_only=True)
    progress_percent = fields.Method('get_progress_percent', dump_only=True)

    def get_progress_percent(self, obj):
        return round(min(100.0, (obj.committed_quantity / obj.target_quantity) * 100), 1) if obj.target_quantity else 0.0

    class Meta:
        model = GroupOrder
        include_fk = True
        fields = (
            'id', 'product_id', 'farmer_id', 'title', 'description', 'target_quantity',
            'min_quantity', 'committed_quantity', 'unit', 'price_per_unit', 'deposit_percent',
            'deadline', 'status', 'delivery_location', 'transport_mode', 'progress_percent',
            'created_at', 'updated_at', 'commitments', 'product',
        )
        dump_only = ('id', 'progress_percent', 'created_at', 'updated_at', 'commitments', 'product')


class HarvestPreorderSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = HarvestPreorder
        include_fk = True
        fields = ('id', 'harvest_plan_id', 'buyer_id', 'quantity', 'unit', 'deposit_amount', 'status', 'created_at', 'updated_at')
        dump_only = ('id', 'created_at', 'updated_at')


class HarvestPlanSchema(ma.SQLAlchemyAutoSchema):
    preorders = ma.Nested(HarvestPreorderSchema, many=True, dump_only=True)
    product = ma.Nested('app.schemas.product.ProductSchema', only=('id', 'title', 'unit', 'price_per_unit', 'image_url', 'is_premium'), dump_only=True)

    class Meta:
        model = HarvestPlan
        include_fk = True
        fields = (
            'id', 'farmer_id', 'product_id', 'field_name', 'crop_name', 'planting_date',
            'harvest_start', 'harvest_end', 'expected_quantity', 'unit', 'unit_weight_kg',
            'price_per_unit', 'status', 'visibility', 'notes', 'created_at', 'updated_at', 'preorders', 'product',
        )
        dump_only = ('id', 'created_at', 'updated_at', 'preorders', 'product')


class ReceiptSchema(ma.SQLAlchemyAutoSchema):
    snapshot = fields.Raw(attribute='snapshot_json')

    class Meta:
        model = Receipt
        include_fk = True
        fields = (
            'id', 'order_id', 'receipt_number', 'buyer_id', 'farmer_id', 'currency',
            'subtotal', 'transport_cost', 'processing_fee', 'discount', 'total_amount',
            'payment_reference', 'escrow_transaction_id', 'status', 'snapshot', 'issued_at',
        )
        dump_only = ('id', 'issued_at')


escrow_transaction_schema = EscrowTransactionSchema()
escrow_transactions_schema = EscrowTransactionSchema(many=True)
transport_quote_schema = TransportQuoteSchema()
transport_quotes_schema = TransportQuoteSchema(many=True)
sms_command_schema = SmsCommandSchema()
sms_commands_schema = SmsCommandSchema(many=True)
market_price_schema = MarketPriceObservationSchema()
market_prices_schema = MarketPriceObservationSchema(many=True)
group_order_schema = GroupOrderSchema()
group_orders_schema = GroupOrderSchema(many=True)
group_commitment_schema = GroupOrderCommitmentSchema()
harvest_plan_schema = HarvestPlanSchema()
harvest_plans_schema = HarvestPlanSchema(many=True)
harvest_preorder_schema = HarvestPreorderSchema()
harvest_preorders_schema = HarvestPreorderSchema(many=True)
receipt_schema = ReceiptSchema()
receipts_schema = ReceiptSchema(many=True)
