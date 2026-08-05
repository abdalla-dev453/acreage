from app import ma
from app.models.chat import ChatMessage
from app.schemas.user import UserSchema

class ChatMessageSchema(ma.SQLAlchemyAutoSchema):
    sender = ma.Nested(UserSchema, only=('id', 'username', 'avatar_url'))
    receiver = ma.Nested(UserSchema, only=('id', 'username', 'avatar_url'))

    class Meta:
        model = ChatMessage
        load_instance = True

chat_message_schema = ChatMessageSchema()
chat_messages_schema = ChatMessageSchema(many=True)