import re

def validate_email(email):
    pattern = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    return isinstance(email, str) and bool(re.fullmatch(pattern, email))


def validate_password(password):
    """ 
    Validates pasword strength:
    -At least 8 characters
    -At least 1 uppercase letter
    -At least 1 lowercase letter
    -At least 1 number
    """
    if not isinstance(password, str):
        return False, "Password must be a string."
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter."
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter."
    if not re.search(r'[0-9]', password):
        return False, "Password must contain at least one number."
    return True, "Strong password."


def sanitize_string(val):
    if isinstance(val, str):
        return val.strip()
    return None
