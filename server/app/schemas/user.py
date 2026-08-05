from app import ma
from app.models.user import User

class UserSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = User
        load_instance = True
        exclude = ("password_hash",)  # Exclude password_hash from serialization

user_schema = UserSchema()
users_schema = UserSchema(many=True)