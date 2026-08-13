from datetime import datetime, date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.farm_log import FarmLog
from app.schemas.farm_log import farm_log_schema, farm_logs_schema
from app.utils.http import json_object

farm_logs_bp = Blueprint('farm_logs', __name__)

@farm_logs_bp.route('/', methods=['GET'])
@jwt_required()
def get_logs():
    user_id = int(get_jwt_identity())
    # Order by target log_date descending so the latest/scheduled activities appear first
    logs = FarmLog.query.filter_by(farmer_id=user_id).order_by(FarmLog.log_date.desc(), FarmLog.logged_at.desc()).all()
    return farm_logs_schema.jsonify(logs), 200


@farm_logs_bp.route('/', methods=['POST'])
@jwt_required()
def create_log():
    user_id = int(get_jwt_identity())
    data, error = json_object()
    if error:
        return error

    # Required field check
    if not data.get('field_name') or not data.get('activity_type'):
        return jsonify({"message": "field_name and activity_type are required."}), 400

    # 1. Parse log_date (Target activity date)
    log_date_str = data.get('log_date')
    if log_date_str:
        try:
            log_date = datetime.strptime(log_date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({"message": "Invalid log_date format. Use YYYY-MM-DD"}), 400
    else:
        log_date = date.today()

    # 2. Parse estimated_harvest_date
    harvest_date_str = data.get('estimated_harvest_date')
    harvest_date = None
    if harvest_date_str:
        try:
            harvest_date = datetime.strptime(harvest_date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({"message": "Invalid estimated_harvest_date format. Use YYYY-MM-DD"}), 400

    # 3. Create the log entry matching frontend expectations
    log = FarmLog(
        farmer_id=user_id,
        field_name=data.get('field_name'),
        activity_type=data.get('activity_type'),
        description=data.get('description'),
        inputs_used=data.get('inputs_used'),
        status=data.get('status', 'Completed'),
        log_date=log_date,
        log_time=data.get('log_time', '08:00'),
        estimated_harvest_date=harvest_date
    )
    
    db.session.add(log)
    db.session.commit()
    return farm_log_schema.jsonify(log), 201