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
            # Administrative internals. Exposing token_version would hand an
            # attacker the value the server compares each request against, and
            # frozen_reason / frozen_by_id / frozen_at are moderation records
            # that belong in the admin API, not in a profile payload.
            #
            # is_superadmin and account_status are deliberately included: they
            # describe the caller's own standing, the UI needs them to show the
            # admin panel and a "your account is frozen" banner, and they are
            # not secret. Every /api/admin route re-checks them server-side.
            'token_version',
            'frozen_reason',
            'frozen_by_id',
            'frozen_at',
        )

user_schema = UserSchema()
users_schema = UserSchema(many=True)