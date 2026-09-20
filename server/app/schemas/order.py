from app import ma
from marshmallow import fields
from app.models.order import Order, OrderItem
from app.schemas.product import ProductSchema
from app.schemas.user import UserSchema


class OrderItemSchema(ma.SQLAlchemyAutoSchema):
    product = ma.Nested(ProductSchema, only=("id", "title", "unit", "image_url"))

    class Meta:
        model = OrderItem
        load_instance = True
        include_fk = True



class OrderSchema(ma.SQLAlchemyAutoSchema):
    price_snapshot = fields.Raw(attribute='price_snapshot_json')
    items = ma.Nested(OrderItemSchema, many=True)
    buyer = ma.Nested(UserSchema, only=("id", "username", "email"))
    farmer = ma.Nested(UserSchema, only=("id", "username", "location"))
    transport_quote = ma.Nested('app.schemas.commerce.TransportQuoteSchema', only=(
        'id', 'provider', 'mode', 'cost', 'currency', 'eta_minutes', 'status', 'expires_at',
    ), dump_only=True)
    escrow_transaction = ma.Nested('app.schemas.commerce.EscrowTransactionSchema', only=(
        'id', 'status', 'amount', 'currency', 'provider', 'provider_transaction_id',
        'checkout_request_id', 'mpesa_receipt_number', 'funded_at', 'released_at',
        'refunded_at', 'dispute_reason', 'updated_at',
    ), dump_only=True)
    receipt = ma.Nested('app.schemas.commerce.ReceiptSchema', only=(
        'id', 'receipt_number', 'total_amount', 'currency', 'status', 'issued_at',
    ), dump_only=True)

    class Meta:
        model = Order
        load_instance = True
        include_fk = True
        fields = (
            "id", "order_code", "buyer_id", "farmer_id", "total_amount",
            "status", "payment_status", "delivery_address", "contact_phone",
            "delivery_lat", "delivery_lng", "origin_location", "quality_status",
            "transport_quote_id", "transport_cost", "sms_command_id", "group_order_id",
            "harvest_preorder_id", "price_snapshot", "created_at",
            "items", "buyer", "farmer", "transport_quote", "escrow_transaction", "receipt",
        )


order_schema = OrderSchema()
orders_schema = OrderSchema(many=True)