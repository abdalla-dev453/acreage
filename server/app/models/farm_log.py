from app import db
from app.utils.time import utcnow


class FarmLog(db.Model):
    __tablename__ = "farm_logs"

    id = db.Column(db.Integer, primary_key=True)
    farmer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Core Details
    field_name = db.Column(db.String(100), nullable=False)  # e.g., Section A - Tomatoes
    activity_type = db.Column(db.String(100), nullable=False)  # Planting & Sowing, Fertilizer Application, etc.
    description = db.Column(db.Text, nullable=True)
    inputs_used = db.Column(db.String(250), nullable=True)  # e.g., Organic NPK 50kg
    
    # Scheduling & Status (Crucial for Calendar View)
    status = db.Column(db.String(20), nullable=False, default="Completed")  # 'Completed' | 'Scheduled'
    log_date = db.Column(db.Date, nullable=False)  # Target date for the activity
    log_time = db.Column(db.String(10), nullable=True, default="08:00")  # e.g., '08:00'
    estimated_harvest_date = db.Column(db.Date, nullable=True)
    
    # Metadata
    logged_at = db.Column(db.DateTime, default=utcnow)

    def to_dict(self):
        """Helper serializer matching standard JSON schema expected by React UI"""
        return {
            "id": self.id,
            "farmer_id": self.farmer_id,
            "field_name": self.field_name,
            "activity_type": self.activity_type,
            "description": self.description,
            "inputs_used": self.inputs_used,
            "status": self.status,
            "log_date": self.log_date.isoformat() if self.log_date else None,
            "log_time": self.log_time,
            "estimated_harvest_date": self.estimated_harvest_date.isoformat() if self.estimated_harvest_date else None,
            "logged_at": self.logged_at.isoformat() if self.logged_at else None,
        }