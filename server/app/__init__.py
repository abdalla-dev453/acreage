import os
import logging
from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_migrate import Migrate
from flask_marshmallow import Marshmallow


db = SQLAlchemy()
jwt = JWTManager()
limiter = Limiter(key_func=get_remote_address, default_limits=["200 per day", "50 per hour"])
migrate = Migrate()
ma = Marshmallow()

def create_app(config_class=None):
    app = Flask(__name__)
    
    if config_class:
        app.config.from_object(config_class)
    else:
        from .config import Config
        app.config.from_object(Config)

    logging.basicConfig(
        level=getattr(logging, app.config.get("LOG_LEVEL", "INFO"), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
        
    db.init_app(app)
    jwt.init_app(app)
    ma.init_app(app)
    migrate.init_app(app, db)
    
    # 1. Parse CORS origins cleanly (ensures list format)
    raw_origins = app.config.get("CORS_ORIGINS", ["http://localhost:3000", "http://127.0.0.1:3000"])
    if isinstance(raw_origins, str):
        origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    else:
        origins = raw_origins

    # 2. Configure CORS with authorization credentials support
    CORS(app, resources={r"/api/*": {"origins": origins}}, supports_credentials=True)
    
    limiter.init_app(app)

    # Register every model before schemas are imported by the route modules.
    # SQLAlchemy otherwise tries to configure User's relationships before
    # Product, Order, and the other related models exist in its registry.
    from . import models  # noqa: F401

    @app.after_request
    def log_request(response):
        # Deliberately excludes request bodies, headers, credentials, and tokens.
        app.logger.info("HTTP request", extra={
            "method": request.method,
            "path": request.path,
            "status": response.status_code,
            "remote_addr": request.remote_addr,
        })
        return response
    
    # Security Warning
    if app.config.get("USING_DEFAULT_SECRETS") and not app.debug:
        logging.warning("WARNING: Using default security keys in a non-debug environment!")

    # Register Blueprints
    from .routes.auth import auth_bp
    from .routes.products import products_bp
    from .routes.analytics import analytics_bp
    from .routes.chat import chat_bp
    from .routes.reviews import reviews_bp
    from .routes.orders import orders_bp
    from .routes.payouts import payouts_bp
    from .routes.farm_logs import farm_logs_bp

    app.register_blueprint(analytics_bp, url_prefix="/api/analytics")
    app.register_blueprint(products_bp, url_prefix="/api/products")
    app.register_blueprint(chat_bp, url_prefix="/api/chat")
    app.register_blueprint(reviews_bp, url_prefix="/api/reviews")
    app.register_blueprint(orders_bp, url_prefix="/api/orders")
    app.register_blueprint(payouts_bp, url_prefix="/api/payouts")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(farm_logs_bp, url_prefix="/api/farm_logs")

    # Global Health Check Endpoint
    @app.route("/health")
    def health_check():
        return jsonify({"status": "healthy"}), 200

    # Global 404 & 500 JSON Handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"message": "Resource not found"}), 404

    @app.errorhandler(500)
    def internal_error(e):
        db.session.rollback()
        app.logger.exception("Unhandled server error")
        return jsonify({"message": "An internal server error occurred"}), 500

    @app.errorhandler(HTTPException)
    def http_error(error):
        return jsonify({"message": error.description}), error.code

    @app.teardown_request
    def rollback_failed_request(exception):
        if exception is not None:
            db.session.rollback()
            app.logger.exception("Request failed and transaction was rolled back", exc_info=exception)

    return app
