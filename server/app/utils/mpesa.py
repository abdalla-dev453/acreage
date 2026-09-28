import os
import logging
import threading
import time

import requests
from requests.auth import HTTPBasicAuth

logger = logging.getLogger(__name__)

# Daraja access tokens are valid for one hour. This used to be fetched over the
# network on every call, and it is called from inside user-facing requests —
# order placement, order payment and payouts — so each one paid a full blocking
# round-trip to Safaricom before it could even start the STK push. Caching it
# removes one of the two external calls sitting on the checkout critical path.
#
# The TTL is 55 minutes rather than 60 so a token is never presented in the
# window where Safaricom would reject it mid-flight.
TOKEN_TTL_SECONDS = int(os.getenv('MPESA_TOKEN_TTL_SECONDS', '3300'))

_token_lock = threading.Lock()
_token_cache = {'token': None, 'expires_at': 0.0}


def _cached_token():
    token = _token_cache['token']
    if token and time.monotonic() < _token_cache['expires_at']:
        return token
    return None


def invalidate_mpesa_access_token():
    """Drop the cached token, e.g. after Safaricom returns an auth error."""
    with _token_lock:
        _token_cache['token'] = None
        _token_cache['expires_at'] = 0.0


def get_mpesa_access_token():
    cached = _cached_token()
    if cached:
        return cached

    # A checkout storm from one worker should produce one token fetch, not ten.
    with _token_lock:
        cached = _cached_token()
        if cached:
            return cached

        consumer_key = str(os.getenv('MPESA_CONSUMER_KEY'))
        consumer_secret = str(os.getenv('MPESA_CONSUMER_SECRET'))
        env = os.getenv('MPESA_ENV', 'sandbox')

        base_url = "https://sandbox.safaricom.co.ke" if env == "sandbox" else "https://api.safaricom.co.ke"
        endpoint = f"{base_url}/oauth/v1/generate?grant_type=client_credentials"

        try:
            response = requests.get(
                endpoint,
                auth=HTTPBasicAuth(consumer_key, consumer_secret),
                timeout=10,
            )
            if response.status_code == 200:
                token = response.json().get('access_token')
                if token:
                    _token_cache['token'] = token
                    _token_cache['expires_at'] = time.monotonic() + TOKEN_TTL_SECONDS
                    logger.debug('Cached a fresh Daraja access token')
                return token
            logger.warning(
                'Daraja OAuth returned HTTP %s', response.status_code
            )
            return None
        except requests.RequestException:
            logger.exception("Daraja OAuth authentication failed")
            return None
