from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Any
from auth.dependencies import get_current_user
from database import get_service_client
from .workflows import WORKFLOWS
from .schemas import (
    GuidanceWorkflowSchema, 
    StartGuidanceRequest, 
    StepCompleteRequest, 
    WorkflowActionRequest, 
    GuidanceEventRequest, 
    GuidanceSettingsRequest
)
from .service import check_guidance_needed, log_guidance_event, upsert_guidance_progress

router = APIRouter(prefix="/guidance", tags=["guidance"])

@router.post("/seed")
def seed_guidance_workflows(user: dict = Depends(get_current_user)):
    """Seed the default guidance workflows into the database. (Requires auth)"""
    client = get_service_client()
    
    for workflow in WORKFLOWS:
        wf_data = {
            "id": workflow["id"],
            "workflow_key": workflow["name"],
            "title_en": workflow["description"],
            "target_role": workflow["target_role"],
            "is_active": workflow["is_active"]
        }
        
        # Upsert Workflow
        client.table("guidance_workflows").upsert(wf_data, on_conflict="id").execute()
        
        # Upsert Steps
        for step in workflow.get("steps", []):
            step_data = {k: v for k, v in step.items()}
            step_data["workflow_id"] = workflow["id"]
            
            # Use workflow_id and step_order as a unique combination to update if no ID is present,
            # but since step IDs aren't in WORKFLOWS dict, we'll fetch existing by workflow_id and step_order
            existing_step = client.table("guidance_steps").select("id").eq("workflow_id", workflow["id"]).eq("step_order", step["step_order"]).maybe_single().execute()
            
            if existing_step and existing_step.data:
                client.table("guidance_steps").update(step_data).eq("id", existing_step.data["id"]).execute()
            else:
                client.table("guidance_steps").insert(step_data).execute()
                
    return {"status": "success", "message": "Workflows seeded successfully."}

@router.get("/workflows/{workflow_id}", response_model=GuidanceWorkflowSchema)
def get_workflow(workflow_id: str, user: dict = Depends(get_current_user)):
    client = get_service_client()
    wf_res = client.table("guidance_workflows").select("*").eq("id", workflow_id).maybe_single().execute()
    if not wf_res or not wf_res.data:
        raise HTTPException(status_code=404, detail="Workflow not found")
        
    steps_res = client.table("guidance_steps").select("*").eq("workflow_id", workflow_id).order("step_order").execute()
    
    workflow_data = dict(wf_res.data)
    workflow_data["name"] = workflow_data.get("workflow_key", "")
    workflow_data["steps"] = steps_res.data if steps_res and steps_res.data else []
    
    return workflow_data

@router.get("/current")
def get_current_guidance(screen: str = Query(...), user: dict = Depends(get_current_user)):
    workflow_id = check_guidance_needed(user["id"], screen)
    if not workflow_id:
        return {"workflow": None}
        
    # Fetch workflow object to return
    client = get_service_client()
    wf_res = client.table("guidance_workflows").select("*").eq("id", workflow_id).maybe_single().execute()
    steps_res = client.table("guidance_steps").select("*").eq("workflow_id", workflow_id).order("step_order").execute()
    
    if wf_res and wf_res.data:
        workflow_data = dict(wf_res.data)
        workflow_data["name"] = workflow_data.get("workflow_key", "")
        workflow_data["steps"] = steps_res.data if steps_res and steps_res.data else []
        return {"workflow": workflow_data}
    return {"workflow": None}

@router.post("/start")
def start_guidance(req: StartGuidanceRequest, user: dict = Depends(get_current_user)):
    upsert_guidance_progress(user["id"], req.workflow_id, "active")
    log_guidance_event(user["id"], "GUIDE_STARTED", req.workflow_id)
    return {"status": "success"}

@router.post("/step-complete")
def complete_step(req: StepCompleteRequest, user: dict = Depends(get_current_user)):
    upsert_guidance_progress(user["id"], req.workflow_id, "active", req.step_id)
    log_guidance_event(user["id"], "GUIDE_STEP_COMPLETED", req.workflow_id, step_id=req.step_id)
    return {"status": "success"}

@router.post("/pause")
def pause_guidance(req: WorkflowActionRequest, user: dict = Depends(get_current_user)):
    upsert_guidance_progress(user["id"], req.workflow_id, "paused")
    log_guidance_event(user["id"], "GUIDE_PAUSED", req.workflow_id)
    return {"status": "success"}

@router.post("/resume")
def resume_guidance(req: WorkflowActionRequest, user: dict = Depends(get_current_user)):
    upsert_guidance_progress(user["id"], req.workflow_id, "active")
    log_guidance_event(user["id"], "GUIDE_RESUMED", req.workflow_id)
    return {"status": "success"}

@router.post("/skip")
def skip_guidance(req: WorkflowActionRequest, user: dict = Depends(get_current_user)):
    upsert_guidance_progress(user["id"], req.workflow_id, "skipped")
    log_guidance_event(user["id"], "GUIDE_SKIPPED", req.workflow_id)
    return {"status": "success"}

@router.post("/replay")
def replay_guidance(req: WorkflowActionRequest, user: dict = Depends(get_current_user)):
    upsert_guidance_progress(user["id"], req.workflow_id, "active")
    log_guidance_event(user["id"], "GUIDE_REPLAYED", req.workflow_id)
    return {"status": "success"}

@router.post("/complete")
def complete_guidance(req: WorkflowActionRequest, user: dict = Depends(get_current_user)):
    upsert_guidance_progress(user["id"], req.workflow_id, "completed")
    log_guidance_event(user["id"], "GUIDE_COMPLETED", req.workflow_id)
    return {"status": "success"}

@router.post("/events")
def log_event(req: GuidanceEventRequest, user: dict = Depends(get_current_user)):
    log_guidance_event(
        user["id"], 
        req.event_type, 
        req.workflow_id, 
        step_id=req.step_id, 
        screen_name=req.screen_name, 
        target_id=req.target_id, 
        metadata=req.metadata
    )
    return {"status": "success"}

@router.get("/progress")
def get_progress(user: dict = Depends(get_current_user)):
    client = get_service_client()
    prog_res = client.table("user_guidance_progress").select("*").eq("user_id", user["id"]).execute()
    return {"progress": prog_res.data}

@router.put("/settings")
def update_settings(req: GuidanceSettingsRequest, user: dict = Depends(get_current_user)):
    client = get_service_client()
    update_data = {}
    if req.guidance_level is not None:
        # Guidance level might be stored on the user profile or in user_guidance_progress globally?
        # The schema puts `guidance_level` on `user_guidance_progress` per row. 
        # Updating it for a specific workflow if ID is provided, else for all.
        update_data["guidance_level"] = req.guidance_level
        
    if req.dont_show_again is not None:
        update_data["dont_show_again"] = req.dont_show_again
        
    if not update_data:
        return {"status": "ignored"}
        
    query = client.table("user_guidance_progress").update(update_data).eq("user_id", user["id"])
    if req.workflow_id:
        query = query.eq("workflow_id", req.workflow_id)
        
    query.execute()
    return {"status": "success"}
