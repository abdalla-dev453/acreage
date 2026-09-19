from app import ma
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
    items = ma.Nested(OrderItemSchema, many=True)
    buyer = ma.Nested(UserSchema, only=("id", "username", "email"))
    farmer = ma.Nested(UserSchema, only=("id", "username", "location"))

    class Meta:
        model = Order
        load_instance = True
        include_fk = True
        fields = (
            "id", "order_code", "buyer_id", "farmer_id", "total_amount",
            "status", "payment_status", "delivery_address", "contact_phone",
            "delivery_lat", "delivery_lng", "created_at",
            "items", "buyer", "farmer",
        )


order_schema = OrderSchema()
orders_schema = OrderSchema(many=True)