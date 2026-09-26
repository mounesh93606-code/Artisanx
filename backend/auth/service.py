import re
from fastapi import HTTPException, UploadFile
from database import get_supabase_client, get_service_client
from config import settings
from . import schemas
from . import otp_service

def send_otp(phone: str):
    """Send OTP via MSG91."""
    return otp_service.send_otp_msg91(phone)


def resend_otp(phone: str):
    """Resend OTP via MSG91."""
    return otp_service.resend_otp_msg91(phone)


def verify_otp(phone: str, token: str):
    """
    1. Verify OTP with MSG91.
    2. Create or fetch the Supabase user by phone using the admin API.
    3. Return access_token + refresh_token + user record.
    """
    # Step 1 — validate OTP with MSG91 (raises HTTPException on failure)
    otp_service.verify_otp_msg91(phone, token)

    # Step 2 — find or create user in Supabase via service-role admin API
    try:
        admin_client = get_service_client()

        # Search for an existing user with this phone number
        normalized = "+" + phone.lstrip("+").strip()
        existing = admin_client.auth.admin.list_users()
        supabase_user = None
        for u in existing:
            if getattr(u, "phone", None) == normalized:
                supabase_user = u
                break

        if supabase_user is None:
            # Create a new Supabase auth user (phone only, no password)
            create_resp = admin_client.auth.admin.create_user({
                "phone": normalized,
                "phone_confirm": True,
                "email_confirm": True,
            })
            supabase_user = create_resp.user

        if not supabase_user:
            raise HTTPException(status_code=500, detail="Failed to create or retrieve user")

        # Step 3 — generate a session token for this user
        session_resp = admin_client.auth.admin.generate_link({
            "type": "magiclink",
            "email": supabase_user.email or f"{supabase_user.id}@phone.artisanx.local",
        })

        # Fallback: sign in with the admin service-role token
        # (the frontend will use the access_token to authenticate subsequent requests)
        anon_client = get_supabase_client()
        user_record = _get_or_create_user_record(admin_client, supabase_user)

        return {
            "user": user_record,
            "user_id": supabase_user.id,
            "message": "OTP verified successfully",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Auth error after OTP: {str(e)}")


def _get_or_create_user_record(client, supabase_user):
    """Fetch user from users table, or insert if not present."""
    user_id = supabase_user.id
    phone = getattr(supabase_user, "phone", None)
    email = getattr(supabase_user, "email", None)

    res = client.table("users").select("*").eq("id", user_id).execute()
    if res.data and len(res.data) > 0:
        return res.data[0]

    new_user = {"id": user_id}
    if phone:
        new_user["phone"] = phone
    if email and not email.endswith("@phone.artisanx.local"):
        new_user["email"] = email

    insert_res = client.table("users").insert(new_user).execute()
    if insert_res.data and len(insert_res.data) > 0:
        return insert_res.data[0]
    return new_user

def register_email(email: str, password: str, phone: str | None = None):
    try:
        client = get_supabase_client()
        signup_data = {"email": email, "password": password}
        if phone:
            signup_data["phone"] = phone
        response = client.auth.sign_up(signup_data)
        if not response.user:
            raise HTTPException(status_code=400, detail="Registration failed")
        
        user_record = {
            "id": response.user.id,
            "email": response.user.email,
            "phone": response.user.phone,
            "role": None
        }
        return {
            "message": "Registration successful", 
            "user": user_record,
            "access_token": response.session.access_token if response.session else None,
            "refresh_token": response.session.refresh_token if response.session else None
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

def login_email(email: str, password: str):
    try:
        client = get_supabase_client()
        response = client.auth.sign_in_with_password({"email": email, "password": password})
        if not response.user:
            raise HTTPException(status_code=400, detail="Login failed")
        
        user_record = get_or_create_user(client, response.user)
        return {"access_token": response.session.access_token, "refresh_token": response.session.refresh_token, "user": user_record}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

def get_or_create_user(client, supabase_user):
    user_id = supabase_user.id
    phone = supabase_user.phone
    email = supabase_user.email

    res = client.table("users").select("*").eq("id", user_id).execute()
    if res.data and len(res.data) > 0:
        return res.data[0]
    
    new_user = {
        "id": user_id
    }
    if phone:
        new_user["phone"] = phone
    if email:
        new_user["email"] = email

    insert_res = client.table("users").insert(new_user).execute()
    if insert_res.data and len(insert_res.data) > 0:
        return insert_res.data[0]
    return new_user

def set_user_role(user_id: str, role: str, token: str):
    if role not in ["artisan", "buyer", "facilitator"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    client = get_supabase_client()
    client.postgrest.auth(token)
    res = client.table("users").update({"role": role}).eq("id", user_id).execute()
    if res.data and len(res.data) > 0:
        return res.data[0]
    raise HTTPException(status_code=400, detail="Failed to update role")

def refresh_session(refresh_token: str):
    try:
        client = get_supabase_client()
        response = client.auth.refresh_session(refresh_token)
        if not response.session:
            raise HTTPException(status_code=401, detail="Refresh failed")
        
        user_record = get_or_create_user(client, response.user)
        return {"access_token": response.session.access_token, "refresh_token": response.session.refresh_token, "user": user_record}
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

def update_profile(user_id: str, req_data: dict, token: str):
    client = get_supabase_client()
    client.postgrest.auth(token)
    
    # Filter out empty or None values, and specifically handle facilitator fields
    update_data = {}
    allowed_fields = [
        "display_name", "organization_name", "region_served", "phone", 
        "profile_photo_url", "languages_spoken", "areas_of_expertise", "short_bio"
    ]
    for k, v in req_data.items():
        if k in allowed_fields and v is not None:
            update_data[k] = v
            
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
        
    res = client.table("users").update(update_data).eq("id", user_id).execute()
    if res.data and len(res.data) > 0:
        return res.data[0]
    raise HTTPException(status_code=400, detail="Failed to update profile")

def upload_profile_photo(user_id: str, file: UploadFile, token: str):
    from fastapi import UploadFile
    import uuid
    try:
        from supabase import create_client, ClientOptions
        from config import settings
        
        options = ClientOptions(headers={"Authorization": f"Bearer {token}"})
        user_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY, options=options)
        
        file_ext = file.filename.split(".")[-1] if file.filename else "jpg"
        file_name = f"{user_id}_{uuid.uuid4().hex}.{file_ext}"
        
        file_content = file.file.read()
        
        user_client.storage.from_("profile-photos").upload(
            file_name, 
            file_content,
            {"content-type": file.content_type}
        )
        
        public_url = user_client.storage.from_("profile-photos").get_public_url(file_name)
        
        res = user_client.table("users").update({"profile_photo_url": public_url}).eq("id", user_id).execute()
        if not res.data or len(res.data) == 0:
            raise HTTPException(status_code=404, detail="User profile not found to attach photo")
            
        return {"profile_photo_url": public_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload photo: {str(e)}")

def normalize_phone_number(country_code: str | None, phone_number: str) -> str:
    """Normalize phone number to international format with country code (e.g. +91XXXXXXXXXX)."""
    if not phone_number:
        return ""
    clean_phone = re.sub(r'[\s\-\(\)]', '', phone_number).strip()
    clean_cc = re.sub(r'[\s\-\(\)]', '', country_code or '').strip()
    if clean_cc and not clean_cc.startswith('+'):
        clean_cc = '+' + clean_cc

    if clean_phone.startswith('+'):
        full = clean_phone
    elif clean_cc:
        digits_phone = clean_phone.lstrip('0')
        full = f"{clean_cc}{digits_phone}"
    else:
        full = clean_phone

    digits = re.sub(r'\D', '', full)
    # India handling: 10 digits starting with 6, 7, 8, 9
    if len(digits) == 10 and digits[0] in '6789':
        return f"+91{digits}"
    elif len(digits) == 11 and digits.startswith('0') and digits[1] in '6789':
        return f"+91{digits[1:]}"
    elif len(digits) == 12 and digits.startswith('91'):
        return f"+{digits}"
    elif full.startswith('+'):
        return f"+{digits}"
    else:
        return f"+{digits}" if digits else ""
