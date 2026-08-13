from app import ma
from app.models.user import User

class UserSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = User
        load_instance = True
        include_fk = True
        dump_only = ('created_at',)
        # These are internal security fields, never meant to leave the server.
        # SQLAlchemyAutoSchema otherwise auto-generates a field for every column,
        # which was leaking the raw token hashes in login/me/order responses.
        exclude = (
            'password_hash',
            'verification_token_hash',
            'verification_token_expires_at',
            'reset_token_hash',
            'reset_token_expires_at',
        )

user_schema = UserSchema()
users_schema = UserSchema(many=True)