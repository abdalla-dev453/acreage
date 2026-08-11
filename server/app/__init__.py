from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from app.config import Config
from flask_marshmallow import Marshmallow
from flask_migrate import Migrate

db = SQLAlchemy()
jwt = JWTManager()
ma = Marshmallow()
migrate = Migrate()
limiter = Limiter(key_func=get_remote_address, default_limits=[])


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Refuse to start with placeholder secrets unless we're explicitly in
    # debug/dev mode. This is the guard that stops someone from
    # accidentally deploying with the default SECRET_KEY / JWT_SECRET_KEY
    # baked into config.py.
    if app.config.get("USING_DEFAULT_SECRETS") and not app.config.get("DEBUG"):
        raise RuntimeError(
            "Refusing to start: SECRET_KEY and/or JWT_SECRET_KEY are still "
            "set to their default dev values. Set real secrets via the "
            "SECRET_KEY and JWT_SECRET_KEY environment variables, or set "
            "FLASK_DEBUG=true for local development only."
        )

    # initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    ma.init_app(app)
    migrate.init_app(app, db)
    limiter.init_app(app)

    # Only allow the configured frontend origin(s) to call this API, instead
    # of allowing every website on the internet (the previous CORS(app)
    # with no restriction).
    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    @app.errorhandler(429)
    def ratelimit_handler(e):
        return jsonify({"message": "Too many requests. Please try again shortly."}), 429

    # Move or keep your models import inside the application context block
    with app.app_context():
        from app.models.user import User
        from app.models.product import Product
        from app.models.order import Order, OrderItem
        from app.models.farm_log import FarmLog
        from app.models.chat import ChatMessage
        from app.models.review import Review
        from app.models.payout import Payout

    # register blueprints   
    from app.routes.auth import auth_bp
    from app.routes.products import products_bp
    from app.routes.orders import orders_bp
    from app.routes.farm_logs import farm_logs_bp
    from app.routes.analytics import analytics_bp
    from app.routes.chat import chat_bp
    from app.routes.reviews import reviews_bp
    from app.routes.payouts import payouts_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(products_bp, url_prefix='/api/products')
    app.register_blueprint(orders_bp, url_prefix='/api/orders')
    app.register_blueprint(farm_logs_bp, url_prefix='/api/farm_logs')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
    app.register_blueprint(chat_bp, url_prefix='/api/chat')
    app.register_blueprint(reviews_bp, url_prefix='/api/reviews')
    app.register_blueprint(payouts_bp, url_prefix='/api/payouts')

    return app
