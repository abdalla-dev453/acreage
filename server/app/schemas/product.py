from app import ma
from app.models.product import Product
from app.schemas.user import UserSchema

class ProductSchema(ma.SQLAlchemyAutoSchema):
    farmer = ma.Nested(UserSchema, only=("id", "username", "location", "phone_number"))

    class Meta:
        model = Product
        load_instance = True
        include_fk = True 


product_schema = ProductSchema()
products_schema = ProductSchema(many=True) 