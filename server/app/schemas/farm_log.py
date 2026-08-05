from app import ma
from app.models.farm_log import FarmLog


class FarmLogSchema(ma.ModelSchema):
    class Meta:
        model = FarmLog
        load_instance = True
        include_fk = True


farm_log_schema = FarmLogSchema()
farm_logs_schema = FarmLogSchema(many=True)