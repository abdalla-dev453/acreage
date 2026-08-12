from app import db
from app.utils.time import utcnow


class FarmLog(db.Model):
    __tablename__ = "farm_logs"

    id = db.Column(db.Integer, primary_key=True)
    farmer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    field_name = db.Column(db.String(100), nullable=False)  # e.g., Section A - Tomatoes
    activity_type = db.Column(db.String(50), nullable=False)  # Planting, Fertilizing, Irrigation, Harvest
    description = db.Column(db.Text, nullable=True)
    inputs_used = db.Column(db.String(200), nullable=True)  # e.g., Organic NPK 50kg
    estimated_harvest_date = db.Column(db.Date, nullable=True)
    logged_at = db.Column(db.DateTime, default=utcnow)
