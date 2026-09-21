from fastapi import HTTPException, UploadFile
from database import get_supabase_client

def send_otp(phone: str):
    try:
        client = get_supabase_client()
        response = client.auth.sign_in_with_otp({"phone": phone})
        return {"message": "OTP sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

def verify_otp(phone: str, token: str):
    try:
        client = get_supabase_client()
        response = client.auth.verify_otp({"phone": phone, "token": token, "type": "sms"})
        if not response.user:
            raise HTTPException(status_code=400, detail="Invalid OTP")
        
        user_record = get_or_create_user(client, response.user)
        return {"access_token": response.session.access_token, "refresh_token": response.session.refresh_token, "user": user_record}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

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
