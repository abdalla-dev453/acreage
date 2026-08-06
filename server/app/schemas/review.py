from app import ma
from app.models.review import Review
from app.schemas.user import UserSchema

class ReviewSchema(ma.SQLAlchemyAutoSchema):
    reviewer = ma.Nested(UserSchema, only=('id', 'username', 'avatar_url'))

    class Meta:
        model = Review
        load_instance = True
        include_fk = True

review_schema = ReviewSchema()
reviews_schema = ReviewSchema(many=True)