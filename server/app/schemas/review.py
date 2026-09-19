from app import ma
from app.models.review import Review, ReviewComment


class ReviewCommentSchema(ma.SQLAlchemyAutoSchema):
    user = ma.Nested('app.schemas.user.UserSchema', only=('id', 'username', 'avatar_url'), dump_only=True)

    class Meta:
        model = ReviewComment
        load_instance = True
        include_fk = True
        fields = ('id', 'review_id', 'user_id', 'text', 'created_at', 'user')
        dump_only = ('id', 'created_at', 'user')


class ReviewSchema(ma.SQLAlchemyAutoSchema):
    reviewer = ma.Nested('app.schemas.user.UserSchema', only=('id', 'username', 'avatar_url'), dump_only=True)
    comments = ma.Nested(ReviewCommentSchema, many=True, dump_only=True)

    class Meta:
        model = Review
        load_instance = True
        include_fk = True
        fields = (
            'id',
            'reviewer_id',
            'farmer_id',
            'rating',
            'comment',
            'image_url',
            'like_count',
            'created_at',
            'reviewer',
            'comments',
        )
        dump_only = ('id', 'created_at', 'like_count', 'reviewer', 'comments')


review_schema = ReviewSchema()
reviews_schema = ReviewSchema(many=True)
review_comment_schema = ReviewCommentSchema()
review_comments_schema = ReviewCommentSchema(many=True)
