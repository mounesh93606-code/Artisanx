from typing import Optional
from database import get_service_client
from fastapi import HTTPException
from .workflows import WORKFLOWS

# Hardcoded workflow IDs matching workflows.py
PROFILE_SETUP_ID = "e0b9b3e1-2b1f-4b0e-9b1f-3b0e9b1f3b0e"
FIRST_PRODUCT_ID = "f1c8d2f1-3c2f-4c1e-ac2f-4c1fac2f4c1f"
ENQUIRY_RESPONSE_ID = "e3a1b2c4-5d6e-7f8g-9h0i-1j2k3l4m5n6o"

def check_guidance_needed(user_id: str, screen: str) -> Optional[str]:
    """
    Rule Engine: Evaluates if a specific workflow should be recommended to the user.
    """
    client = get_service_client()
    
    # 1. Check if user is an artisan
    try:
        user_res = client.table("users").select("role").eq("id", user_id).maybe_single().execute()
        if not user_res or not user_res.data or user_res.data.get("role") != "artisan":
            return None
    except Exception:
        return None

    # Check for Profile Setup (if on home or profile screen)
    if screen in ["artisan_home", "profile_setup"]:
        # Check if profile is incomplete
        try:
            profile_res = client.table("artisan_profiles").select("artisan_name, craft_category, location, craft_story").eq("user_id", user_id).maybe_single().execute()
            
            if not profile_res or not profile_res.data or not all(profile_res.data.values()):
                # Verify they haven't dismissed it
                prog_res = client.table("user_guidance_progress").select("status, dont_show_again").eq("user_id", user_id).eq("workflow_id", PROFILE_SETUP_ID).maybe_single().execute()
                if not prog_res or not prog_res.data or (prog_res.data.get("status") != "completed" and not prog_res.data.get("dont_show_again")):
                    return PROFILE_SETUP_ID
        except Exception:
            pass

    # Check for First Product Upload (if on home or product create screen)
    if screen in ["artisan_home", "product_create"]:
        try:
            products_res = client.table("products").select("id", count="exact").eq("artisan_id", user_id).execute()
            count = products_res.count if (products_res and products_res.count is not None) else (len(products_res.data) if products_res and products_res.data else 0)
            if count == 0:
                # Verify they haven't dismissed it
                prog_res = client.table("user_guidance_progress").select("status, dont_show_again").eq("user_id", user_id).eq("workflow_id", FIRST_PRODUCT_ID).maybe_single().execute()
                if not prog_res or not prog_res.data or (prog_res.data.get("status") != "completed" and not prog_res.data.get("dont_show_again")):
                    return FIRST_PRODUCT_ID
        except Exception:
            pass

    # Check for Enquiry Response (if on enquiry list)
    if screen in ["enquiry_list"]:
        try:
            enquiries_res = client.table("buyer_enquiries").select("id").eq("artisan_id", user_id).eq("status", "pending").execute()
            if enquiries_res and enquiries_res.data and len(enquiries_res.data) > 0:
                prog_res = client.table("user_guidance_progress").select("status, dont_show_again").eq("user_id", user_id).eq("workflow_id", ENQUIRY_RESPONSE_ID).maybe_single().execute()
                if not prog_res or not prog_res.data or (prog_res.data.get("status") != "completed" and not prog_res.data.get("dont_show_again")):
                    return ENQUIRY_RESPONSE_ID
        except Exception:
            pass

    return None

def log_guidance_event(user_id: str, event_type: str, workflow_id: str, step_id: Optional[str] = None, screen_name: Optional[str] = None, target_id: Optional[str] = None, metadata: dict = None):
    client = get_service_client()
    try:
        client.table("guidance_events").insert({
            "user_id": user_id,
            "workflow_id": workflow_id,
            "step_id": step_id,
            "event_type": event_type,
            "screen_name": screen_name,
            "target_id": target_id,
            "metadata_json": metadata or {}
        }).execute()
    except Exception:
        pass

def upsert_guidance_progress(user_id: str, workflow_id: str, status: str, step_id: Optional[str] = None):
    client = get_service_client()
    try:
        # Check if exists
        prog = client.table("user_guidance_progress").select("id").eq("user_id", user_id).eq("workflow_id", workflow_id).maybe_single().execute()
        
        data = {
            "user_id": user_id,
            "workflow_id": workflow_id,
            "status": status,
            "current_step_id": step_id
        }
        
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
        
        if status == 'completed':
            data['completed_at'] = now
        elif status == 'skipped':
            data['skipped_at'] = now
        elif status in ['active', 'paused']:
            data['last_shown_at'] = now

        if prog and prog.data:
            client.table("user_guidance_progress").update(data).eq("id", prog.data["id"]).execute()
        else:
            client.table("user_guidance_progress").insert(data).execute()
    except Exception:
        pass
