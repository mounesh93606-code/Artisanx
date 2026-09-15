from fastapi import APIRouter, Depends, HTTPException
from auth.dependencies import get_current_user, get_token, security
from database import get_authenticated_client
from .schemas import EnquiryCreate, EnquiryRespond
from datetime import datetime
from notifications.service import create_notification

router = APIRouter(prefix="/enquiries", tags=["enquiries"])

@router.post("/")
def route_create_enquiry(req: EnquiryCreate, current_user: dict = Depends(get_current_user), token: str = Depends(get_token)) -> dict:
    from database import get_service_client
    service_client = get_service_client()
    
    user_role = current_user.get("role")
    if user_role and user_role != "buyer":
        raise HTTPException(status_code=403, detail="Unauthorized: Only buyers can send enquiries")
    buyer_id = current_user["id"]
    
    # Get product to find the specific artisan who created it
    product_res = service_client.table("products").select("artisan_id, title").eq("id", req.product_id).execute()
    if not product_res.data:
        raise HTTPException(status_code=404, detail="Product not found")
        
    artisan_id = product_res.data[0].get("artisan_id")
    if not artisan_id:
        raise HTTPException(status_code=400, detail="Product has no assigned artisan")
        
    product_title = product_res.data[0].get("title", "Product")
    
    # Insert enquiry assigned to that specific artisan
    enq_data = {
        "product_id": req.product_id,
        "buyer_id": buyer_id,
        "artisan_id": artisan_id,
        "quantity": req.quantity,
        "budget": req.budget,
        "delivery_deadline": req.delivery_deadline.isoformat() if req.delivery_deadline else None,
        "customisation_request": req.customisation_request,
        "buyer_message": req.buyer_message,
        "requested_variant": req.requested_variant,
        "status": "new"
    }
    
    enq_res = service_client.table("buyer_enquiries").insert(enq_data).execute()
    if not enq_res.data:
        raise HTTPException(status_code=500, detail="Failed to create enquiry")
        
    enquiry_id = enq_res.data[0]["id"]
    
    # Insert notification for that specific artisan
    try:
        create_notification(
            user_id=artisan_id,
            type="enquiry_new",
            title="New enquiry received",
            message=f"You have a new enquiry for {product_title}.",
            metadata={"enquiry_id": enquiry_id, "product_id": req.product_id}
        )
    except Exception as e:
        print(f"Warning: Failed to create notification for artisan {artisan_id}: {e}")
    
    return {"status": "success", "enquiry_id": enquiry_id}

@router.get("/buyer")
def list_buyer_enquiries(current_user: dict = Depends(get_current_user), token: str = Depends(get_token)) -> dict:
    client = get_authenticated_client(token)
    
    res = client.table("buyer_enquiries").select(
        "*, products(title, images:product_images(image_url)), artisan:users!artisan_id(display_name)"
    ).eq("buyer_id", current_user["id"]).order("created_at", desc=True).execute()
    
    return {"enquiries": res.data}

@router.get("/artisan")
def list_artisan_enquiries(current_user: dict = Depends(get_current_user), token: str = Depends(get_token)) -> dict:
    client = get_authenticated_client(token)
    
    res = client.table("buyer_enquiries").select(
        "*, products(title, images:product_images(image_url)), buyer:users!buyer_id(display_name)"
    ).eq("artisan_id", current_user["id"]).order("created_at", desc=True).execute()
    
    return {"enquiries": res.data}

@router.get("/{enquiry_id}")
def route_get_enquiry(enquiry_id: str, current_user: dict = Depends(get_current_user), token: str = Depends(get_token)) -> dict:
    client = get_authenticated_client(token)
    res = client.table("buyer_enquiries").select(
        "*, products(title, description, price, min_safe_price, suggested_price, images:product_images(image_url)), buyer:users!buyer_id(display_name, email, phone), artisan:users!artisan_id(display_name)"
    ).eq("id", enquiry_id).execute()
    
    if not res.data:
        raise HTTPException(status_code=404, detail="Enquiry not found")
        
    enquiry = res.data[0]
    
    # Verify ownership
    if enquiry["buyer_id"] != current_user["id"] and enquiry["artisan_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Strip private info if user is a buyer
    if current_user["id"] == enquiry["buyer_id"]:
        if enquiry.get("products"):
            enquiry["products"].pop("min_safe_price", None)
            enquiry["products"].pop("suggested_price", None)
    
    # Mark as viewed if artisan is viewing it for the first time
    if current_user["id"] == enquiry["artisan_id"] and enquiry["status"] == "new":
        client.table("buyer_enquiries").update({"status": "viewed"}).eq("id", enquiry_id).execute()
        enquiry["status"] = "viewed"
        
    return enquiry

@router.put("/{enquiry_id}/respond")
def route_respond_enquiry(enquiry_id: str, req: EnquiryRespond, current_user: dict = Depends(get_current_user), token: str = Depends(get_token)) -> dict:
    client = get_authenticated_client(token)
    
    # Verify artisan owns the enquiry
    res = client.table("buyer_enquiries").select("artisan_id, buyer_id, product_id, products(title)").eq("id", enquiry_id).execute()
    if not res.data or res.data[0]["artisan_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    buyer_id = res.data[0]["buyer_id"]
    product_id = res.data[0]["product_id"]
    product_title = res.data[0].get("products", {}).get("title") if res.data[0].get("products") else ""
        
    update_data = {
        "status": "responded",
        "artisan_response": req.artisan_response,
        "artisan_response_note": req.artisan_response_note,
        "responded_at": datetime.utcnow().isoformat()
    }
    
    upd_res = client.table("buyer_enquiries").update(update_data).eq("id", enquiry_id).execute()
    if not upd_res.data:
        raise HTTPException(status_code=500, detail="Failed to update response")
        
    # Create notification for buyer
    preview = (req.artisan_response_note or req.artisan_response or "")
    preview = preview[:60] + "..." if len(preview) > 60 else preview

    create_notification(
        user_id=buyer_id,
        type="enquiry_response",
        title="Artisan responded to your enquiry",
        message="An artisan has responded to your enquiry.",
        metadata={
            "enquiry_id": enquiry_id,
            "product_id": product_id,
            "product_title": product_title,
            "response_preview": preview
        }
    )
        
    return {"status": "success", "enquiry": upd_res.data[0]}
