import os
import logging
import base64
import json
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import credentials, auth

security = HTTPBearer(auto_error=False)

firebase_inited = False
firebase_auth_enabled = False

firebase_creds_json = os.getenv("FIREBASE_SERVICE_ACCOUNT")
if firebase_creds_json:
    try:
        try:
            decoded = base64.b64decode(firebase_creds_json).decode("utf-8")
            creds_dict = json.loads(decoded)
        except Exception:
            creds_dict = json.loads(firebase_creds_json)
        
        cred = credentials.Certificate(creds_dict)
        firebase_admin.initialize_app(cred)
        firebase_inited = True
        firebase_auth_enabled = True
        logging.info("Firebase Admin initialized successfully with service account.")
    except Exception as e:
        logging.error(f"Failed to initialize Firebase Admin with service account: {e}")

if not firebase_inited:
    if os.getenv("K_SERVICE"):
        try:
            firebase_admin.initialize_app()
            firebase_inited = True
            firebase_auth_enabled = True
            logging.info("Firebase Admin initialized successfully using default credentials.")
        except Exception as e:
            logging.warning(f"Failed to initialize Firebase Admin using default credentials: {e}")
    else:
        logging.info("Firebase Auth is disabled (no FIREBASE_SERVICE_ACCOUNT or K_SERVICE). Falling back to Mock Auth.")

def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> str:
    if not firebase_auth_enabled:
        return "local-user-123"

    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization token",
        )
    
    token = credentials.credentials
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token["uid"]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired Firebase ID token: {str(e)}",
        )
