"""Shared HTTP validation helpers used by route handlers."""

from flask import jsonify, request


def json_object():
    """Return a JSON object or a consistent 400 response tuple."""
    data = request.get_json(silent=True)
    if isinstance(data, dict):
        return data, None
    # Multipart or urlencoded submissions, for example the profile/avatar
    # upload which legitimately sends form fields alongside a file.
    if request.form:
        return request.form.to_dict(), None
    return None, (jsonify({'message': 'Request body must be a JSON object'}), 400)
