from app import ma
from app.models.review import Review
from app.schemas.user import UserSchema


class ReviewSchema(ma.SQLAlchemyAutoSchema):
    # Nested representation of the reviewer
    reviewer = ma.Nested(UserSchema, only=('id', 'username', 'avatar_url'), dump_only=True)

    class Meta:
        model = Review
        load_instance = True
        include_fk = True
        # Explicitly listing fields ensures image_url is always serialized clean
        fields = (
            'id',
            'reviewer_id',
            'farmer_id',
            'rating',
            'comment',
            'image_url',
            'created_at',
            'reviewer'
        )
        dump_only = ('id', 'created_at', 'reviewer')


review_schema = ReviewSchema()
reviews_schema = ReviewSchema(many=True)