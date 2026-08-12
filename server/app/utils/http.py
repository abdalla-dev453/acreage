"""Shared HTTP validation helpers used by route handlers."""

from flask import jsonify, request


def json_object():
    """Return a JSON object or a consistent 400 response tuple."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return None, (jsonify({'message': 'Request body must be a JSON object'}), 400)
    return data, None
