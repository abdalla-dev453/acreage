import pytest

from app import create_app, db


@pytest.fixture()
def app():
    class TestConfig:
        TESTING = True
        SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
        SQLALCHEMY_TRACK_MODIFICATIONS = False
        SECRET_KEY = "test-secret-key-with-safe-length"
        JWT_SECRET_KEY = "test-jwt-secret-key-with-safe-length"
        CORS_ORIGINS = ["http://localhost:5173"]
        SECURITY_TOKEN_EXPIRES_MINUTES = 30
        EMAIL_VERIFICATION_REQUIRED = True
        FRONTEND_URL = "http://localhost:5173"
        MAIL_SERVER = None
        LOG_LEVEL = "WARNING"
        RATELIMIT_ENABLED = False

    application = create_app(TestConfig)
    with application.app_context():
        db.create_all()
        yield application
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()
