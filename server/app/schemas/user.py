from app import ma
from app.models.user import User

class UserSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = User
        load_instance = True
        include_fk = True
        dump_only = ('created_at',) 

    # Dynamic fallback inclusion ensures password security layout parameters remain hidden
    password_hash = ma.auto_field(load_only=True, required=False)

user_schema = UserSchema()
users_schema = UserSchema(many=True)
