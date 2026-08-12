"""UTC clock helpers compatible with naive UTC database columns."""

from datetime import UTC, datetime


def utcnow():
    """Return the current UTC time without using deprecated datetime.utcnow()."""
    return datetime.now(UTC).replace(tzinfo=None)
