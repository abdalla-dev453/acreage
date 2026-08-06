from flask import Blueprint, request, jsonify
from app import db
from app.models.farm_log import FarmLog
from app.schemas.farm_log import farm_log_schema, farm_logs_schema
from flask_jwt_extended import jwt_required, get_jwt_identity

farm_logs_bp = Blueprint('farm_logs', __name__)

@farm_logs_bp.route('/', methods=['GET'])
@jwt_required()
def get_logs():
    user_id = int(get_jwt_identity())
    logs = FarmLog.query.filter_by(farmer_id=user_id).order_by(FarmLog.logged_at.desc()).all()
    return farm_logs_schema.jsonify(logs), 200


@farm_logs_bp.route('/', methods=['POST'])
@jwt_required()
def create_log():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}


    log = FarmLog(
        farmer_id=user_id,
        field_name=data.get('field_name'),
        activity_type=data.get('activity_type'),
        description=data.get('description'),
        inputs_used=data.get('inputs_used')
    )
    
    db.session.add(log)
    db.session.commit()
    return farm_log_schema.jsonify(log), 201