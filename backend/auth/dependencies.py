from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database import get_supabase_client

security = HTTPBearer()

def get_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    return credentials.credentials

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    try:
        client = get_supabase_client()
        user_response = client.auth.get_user(token)
        if not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user_id = user_response.user.id
        
        client.postgrest.auth(token)
        res = client.table("users").select("*").eq("id", user_id).execute()
        if not res.data or len(res.data) == 0:
            raise HTTPException(status_code=404, detail="User record not found")
        
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

optional_security = HTTPBearer(auto_error=False)

def get_optional_user(credentials: HTTPAuthorizationCredentials = Security(optional_security)):
    if not credentials or not credentials.credentials:
        return None
    try:
        client = get_supabase_client()
        user_response = client.auth.get_user(credentials.credentials)
        if not user_response or not user_response.user:
            return None
        
        user_id = user_response.user.id
        client.postgrest.auth(credentials.credentials)
        res = client.table("users").select("*").eq("id", user_id).execute()
        if not res.data or len(res.data) == 0:
            return None
        return res.data[0]
    except Exception:
        return None

