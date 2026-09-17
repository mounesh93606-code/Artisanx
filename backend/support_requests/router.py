from fastapi import APIRouter, Depends, HTTPException
from auth.dependencies import get_current_user, get_token, security
from database import get_authenticated_client, get_service_client
from .schemas import SupportRequestCreate, SupportRequestUpdate
from fastapi.security import HTTPAuthorizationCredentials

router = APIRouter(prefix="/support-requests", tags=["support_requests"])

def get_role(user: dict):
    return user.get("role")

@router.post("/")
def create_support_request(req: SupportRequestCreate, current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    client = get_service_client()
    user_id = current_user["id"]
    role = get_role(current_user)
    
    if role not in ["artisan", "facilitator"]:
        raise HTTPException(status_code=403, detail="Only artisans and facilitators can create support requests")
        
    data = req.dict(exclude_unset=True)
    if role == "artisan":
        data["artisan_id"] = user_id
    else:
        if not req.artisan_id:
            raise HTTPException(status_code=400, detail="artisan_id is required when creating support as facilitator")
        data["artisan_id"] = req.artisan_id
    
    res = client.table("support_requests").insert(data).execute()
    sr_id = res.data[0]["id"]
    
    # Create conversation for this support request
    conv_data = {
        "support_request_id": sr_id,
        "artisan_id": data["artisan_id"]
    }
    client.table("conversations").insert(conv_data).execute()
    
    if role == "artisan":
        from notifications.service import notify_facilitators
        notify_facilitators("support_created", "New Support Request", "A new support request was created by an artisan.", {"support_request_id": sr_id})
    else:
        from notifications.service import create_notification
        create_notification(
            user_id=data["artisan_id"],
            type="support_offered",
            title="Facilitator Support Offered",
            message=f"A facilitator initiated support: {req.issue_summary}",
            metadata={"support_request_id": sr_id}
        )
        from facilitator.service import log_facilitator_activity
        log_facilitator_activity(user_id, "support_offered", "artisan", data["artisan_id"], req.issue_summary)
    
    return {"status": "success", "support_request": res.data[0]}

@router.get("/")
def get_support_requests(current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    client = get_service_client()
    user_id = current_user["id"]
    role = get_role(current_user)
    
    if role == "artisan":
        res = client.table("support_requests").select("*, artisan:users!artisan_id(display_name)").eq("artisan_id", user_id).order("updated_at", desc=True).execute()
    elif role == "facilitator":
        res = client.table("support_requests").select("*, artisan:users!artisan_id(display_name)").order("updated_at", desc=True).execute()
    else:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    srs = res.data or []
    if srs:
        sr_ids = [sr["id"] for sr in srs]
        conv_res = client.table("conversations").select("id, support_request_id").in_("support_request_id", sr_ids).execute()
        conv_map = {}
        for c in (conv_res.data or []):
            if c["support_request_id"] not in conv_map:
                conv_map[c["support_request_id"]] = []
            conv_map[c["support_request_id"]].append(c)
        for sr in srs:
            sr["conversations"] = conv_map.get(sr["id"], [])
        
    return {"support_requests": srs}

@router.get("/{id}")
def get_support_request(id: str, current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    client = get_service_client()
    user_id = current_user["id"]
    role = get_role(current_user)
    
    res = client.table("support_requests").select("*, artisan:users!artisan_id(display_name)").eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Not found")
        
    sr = res.data[0]
    if role == "artisan" and sr["artisan_id"] != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    conv_res = client.table("conversations").select("id").eq("support_request_id", id).execute()
    sr["conversations"] = conv_res.data or []
        
    return {"support_request": sr}

@router.put("/{id}")
def update_support_request(id: str, req: SupportRequestUpdate, current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    client = get_service_client()
    user_id = current_user["id"]
    role = get_role(current_user)
    
    # Check existing
    res = client.table("support_requests").select("*").eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Not found")
        
    sr = res.data[0]
    
    # Both artisan and facilitator can potentially update status (e.g. artisan resolves it, facilitator responds)
    if role == "artisan" and sr["artisan_id"] != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    if role not in ["artisan", "facilitator"]:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    client.table("support_requests").update({"status": req.status}).eq("id", id).execute()
    
    if role == "facilitator":
        from facilitator.service import log_facilitator_activity
        log_facilitator_activity(user_id, "support_updated", "support_request", id, f"Status updated to {req.status}")
    
    return {"status": "success"}
