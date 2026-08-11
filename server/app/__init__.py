import os
import logging
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

db = SQLAlchemy()
jwt = JWTManager()
limiter = Limiter(key_func=get_remote_address, default_limits=["200 per day", "50 per hour"])

def create_app(config_class=None):
    app = Flask(__name__)
    
    if config_class:
        app.config.from_object(config_class)
    else:
        from config import Config
        app.config.from_object(Config)
        
    db.init_app(app)
    jwt.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})
    limiter.init_app(app)
    
    if app.config.get("USING_DEFAULT_SECRETS") and not app.debug:
        logging.warning("WARNING: Using default security keys in a non-debug environment!")

    from auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix="/api/auth")

    @app.route("/health")
    def health_check():
        return jsonify({"status": "healthy"}), 200

    return app
