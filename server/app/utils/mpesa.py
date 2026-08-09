import os
import requests
from requests.auth import HTTPBasicAuth

def get_mpesa_access_token():
    consumer_key = os.getenv('MPESA_CONSUMER_KEY')
    consumer_secret = os.getenv('MPESA_CONSUMER_SECRET')
    env = os.getenv('MPESA_ENV', 'sandbox')
    
    base_url = "https://sandbox.safaricom.co.ke" if env == "sandbox" else "https://api.safaricom.co.ke"
    endpoint = f"{base_url}/oauth/v1/generate?grant_type=client_credentials"
    
    try:
        response = requests.get(endpoint, auth=HTTPBasicAuth(consumer_key, consumer_secret), timeout=10)
        if response.status_code == 200:
            return response.json().get('access_token')
        return None
    except Exception as e:
        print(f"Daraja OAuth Authentication Error: {str(e)}")
        return None
