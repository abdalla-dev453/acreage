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
    farmer = ma.Nested(UserSchema, only=("id", "username", "phone_number"))


    class Meta:
        model = Order
        load_instance = True
        include_fk = True


order_schema = OrderSchema()
orders_schema = OrderSchema(many=True)