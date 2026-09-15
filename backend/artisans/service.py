from fastapi import HTTPException, UploadFile
from database import supabase_client, get_authenticated_client, get_service_client
from .schemas import ArtisanProfileCreate, ArtisanProfileUpdate
import uuid

def create_profile(user_id: str, profile: ArtisanProfileCreate, token: str):
    data = profile.model_dump(exclude_unset=True)
    data["user_id"] = user_id
    
    client = get_authenticated_client(token)
    try:
        res = client.table("artisan_profiles").insert(data).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
    except Exception:
        pass
    
    # Fallback to service client
    s_client = get_service_client()
    s_res = s_client.table("artisan_profiles").insert(data).execute()
    if s_res.data and len(s_res.data) > 0:
        return s_res.data[0]
    raise HTTPException(status_code=400, detail="Failed to create artisan profile")

def update_profile(user_id: str, profile: ArtisanProfileUpdate, token: str):
    data = profile.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    client = get_authenticated_client(token)
    try:
        res = client.table("artisan_profiles").update(data).eq("user_id", user_id).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
    except Exception:
        pass

    # Fallback to service client
    s_client = get_service_client()
    s_res = s_client.table("artisan_profiles").update(data).eq("user_id", user_id).execute()
    if s_res.data and len(s_res.data) > 0:
        return s_res.data[0]
    raise HTTPException(status_code=404, detail="Artisan profile not found")

def get_profile(user_id: str, token: str):
    client = get_authenticated_client(token)
    try:
        res = client.table("artisan_profiles").select("*").eq("user_id", user_id).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
    except Exception:
        pass
    
    # Fallback to service client
    try:
        s_client = get_service_client()
        s_res = s_client.table("artisan_profiles").select("*").eq("user_id", user_id).execute()
        if s_res.data and len(s_res.data) > 0:
            return s_res.data[0]
    except Exception:
        pass
        
    raise HTTPException(status_code=404, detail="Artisan profile not found")

def get_profile_by_id(artisan_id: str, token: str):
    client = get_authenticated_client(token)
    try:
        res = client.table("artisan_profiles").select("*").eq("id", artisan_id).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
    except Exception:
        pass
        
    try:
        s_client = get_service_client()
        s_res = s_client.table("artisan_profiles").select("*").eq("id", artisan_id).execute()
        if s_res.data and len(s_res.data) > 0:
            return s_res.data[0]
    except Exception:
        pass
        
    raise HTTPException(status_code=404, detail="Artisan profile not found")

def upload_profile_photo(user_id: str, file: UploadFile, token: str):
    try:
        from supabase import create_client, ClientOptions
        from config import settings
        
        # Create a fresh authenticated client for this request
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
        
        res = user_client.table("artisan_profiles").update({"profile_photo_url": public_url}).eq("user_id", user_id).execute()
        if not res.data or len(res.data) == 0:
            raise HTTPException(status_code=404, detail="Artisan profile not found to attach photo")
            
        return {"profile_photo_url": public_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload photo: {str(e)}")
