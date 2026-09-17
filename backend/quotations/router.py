from fastapi import APIRouter, Depends, HTTPException
from auth.dependencies import get_current_user, get_token
from database import get_authenticated_client
from .schemas import QuotationCreate, QuotationRevise, QuotationAction
from notifications.service import create_notification
import random
import string
from datetime import datetime

router = APIRouter(prefix="/quotations", tags=["quotations"])

def generate_display_id(prefix: str = "AX-QT"):
    rand_str = ''.join(random.choices(string.digits, k=5))
    return f"{prefix}-{rand_str}"

@router.post("/")
def create_quotation(req: QuotationCreate, current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    client = get_authenticated_client(token)
    if current_user.get("role") != "artisan":
        raise HTTPException(status_code=403, detail="Only artisans can create quotations")
        
    enquiry_res = client.table("buyer_enquiries").select("*").eq("id", str(req.enquiry_id)).execute()
    if not enquiry_res.data:
        raise HTTPException(status_code=404, detail="Enquiry not found")
        
    enquiry = enquiry_res.data[0]
    if enquiry["artisan_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    total_price = float(req.quantity * req.unit_price + req.customization_cost)
    display_id = generate_display_id()
    
    # 1. Insert header
    q_data = {
        "display_id": display_id,
        "enquiry_id": str(req.enquiry_id),
        "product_id": str(enquiry["product_id"]),
        "buyer_id": str(enquiry["buyer_id"]),
        "artisan_id": str(current_user["id"]),
        "current_version": 1,
        "variant_snapshot": enquiry.get("requested_variant"),
        "status": "draft"
    }

    try:
        q_res = client.table("quotations").insert(q_data).execute()
    except Exception as e:
        # Fallback if variant_snapshot column name varies
        if "variant_snapshot" in str(e) or "PGRST204" in str(e):
            q_data.pop("variant_snapshot", None)
            q_res = client.table("quotations").insert(q_data).execute()
        else:
            raise e

    if not q_res.data:
        raise HTTPException(status_code=500, detail="Failed to create quotation")
        
    quotation = q_res.data[0]
    quotation["agreed_variant"] = quotation.get("variant_snapshot")
    
    # 2. Insert revision
    rev_data = {
        "quotation_id": quotation["id"],
        "version": 1,
        "quantity": req.quantity,
        "unit_price": req.unit_price,
        "total_price": total_price,
        "moq": req.moq,
        "customization_cost": req.customization_cost,
        "production_lead_time_days": req.production_lead_time_days,
        "expected_dispatch_date": req.expected_dispatch_date.isoformat() if req.expected_dispatch_date else None,
        "expiry_date": req.expiry_date.isoformat() if req.expiry_date else None,
        "artisan_notes": req.artisan_notes
    }
    client.table("quotation_revisions").insert(rev_data).execute()
    
    return {"status": "success", "quotation": quotation}

@router.post("/{id}/send")
def send_quotation(id: str, current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    client = get_authenticated_client(token)
    q_res = client.table("quotations").select("*").eq("id", id).execute()
    if not q_res.data or q_res.data[0]["artisan_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    client.table("quotations").update({"status": "sent"}).eq("id", id).execute()
    client.table("buyer_enquiries").update({"status": "quote_sent"}).eq("id", q_res.data[0]["enquiry_id"]).execute()
    
    return {"status": "success"}

@router.post("/{id}/revise")
def revise_quotation(id: str, req: QuotationRevise, current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    client = get_authenticated_client(token)
    q_res = client.table("quotations").select("*").eq("id", id).execute()
    if not q_res.data or q_res.data[0]["artisan_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    quotation = q_res.data[0]
    new_version = quotation["current_version"] + 1
    total_price = float(req.quantity * req.unit_price + req.customization_cost)
    
    rev_data = {
        "quotation_id": id,
        "version": new_version,
        "quantity": req.quantity,
        "unit_price": req.unit_price,
        "total_price": total_price,
        "moq": req.moq,
        "customization_cost": req.customization_cost,
        "production_lead_time_days": req.production_lead_time_days,
        "expected_dispatch_date": req.expected_dispatch_date.isoformat() if req.expected_dispatch_date else None,
        "expiry_date": req.expiry_date.isoformat() if req.expiry_date else None,
        "artisan_notes": req.artisan_notes
    }
    client.table("quotation_revisions").insert(rev_data).execute()
    client.table("quotations").update({"current_version": new_version, "status": "draft"}).eq("id", id).execute()
    
    return {"status": "success", "new_version": new_version}

@router.post("/{id}/accept")
def accept_quotation(id: str, current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    client = get_authenticated_client(token)
    q_res = client.table("quotations").select("*, products(title, category, images:product_images(image_url))").eq("id", id).execute()
    if not q_res.data or q_res.data[0]["buyer_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    quotation = q_res.data[0]
    if quotation["status"] == "accepted":
        # Check idempotency: does order already exist?
        ord_res = client.table("orders").select("id").eq("quotation_id", id).execute()
        if ord_res.data:
            return {"status": "success", "order_id": ord_res.data[0]["id"], "message": "Already accepted"}
            
    # Get current active revision
    rev_res = client.table("quotation_revisions").select("*").eq("quotation_id", id).eq("version", quotation["current_version"]).execute()
    if not rev_res.data:
        raise HTTPException(status_code=500, detail="Revision data not found")
    revision = rev_res.data[0]
    
    # 1. Update quotation status
    client.table("quotations").update({"status": "accepted"}).eq("id", id).execute()
    
    # 2. Update enquiry status
    client.table("buyer_enquiries").update({"status": "accepted"}).eq("id", quotation["enquiry_id"]).execute()
    
    # 3. Create order
    display_id = generate_display_id("AX-ORD")
    
    img_url = ""
    if quotation.get("products") and quotation["products"].get("images"):
        img_url = quotation["products"]["images"][0]["image_url"] if len(quotation["products"]["images"]) > 0 else ""
        
    variant_val = quotation.get("variant_snapshot") or quotation.get("agreed_variant")
    product_snapshot = {
        "product_id": quotation["product_id"],
        "title": quotation.get("products", {}).get("title", ""),
        "category": quotation.get("products", {}).get("category", ""),
        "image_url": img_url,
        "variant": variant_val,
        "agreed_unit_price": revision["unit_price"],
        "quantity": revision["quantity"]
    }
    
    order_data = {
        "display_id": display_id,
        "quotation_id": id,
        "enquiry_id": quotation["enquiry_id"],
        "product_id": quotation["product_id"],
        "buyer_id": quotation["buyer_id"],
        "artisan_id": quotation["artisan_id"],
        "status": "confirmed",
        "quantity": revision["quantity"],
        "unit_price": revision["unit_price"],
        "total_order_value": revision["total_price"],
        "customization_details": revision.get("artisan_notes"),
        "product_snapshot": product_snapshot,
        "variant_snapshot": variant_val,
        "expected_dispatch_date": revision.get("expected_dispatch_date")
    }
    
    ord_res = client.table("orders").insert(order_data).execute()
    if not ord_res.data:
        raise HTTPException(status_code=500, detail="Failed to create order")
    order_id = ord_res.data[0]["id"]
    
    # 4. Insert order history
    hist_data = {
        "order_id": order_id,
        "from_status": None,
        "to_status": "confirmed",
        "changed_by": current_user["id"],
        "note": "Order created from accepted quotation"
    }
    client.table("order_status_history").insert(hist_data).execute()
    
    # Notify Artisan
    create_notification(
        user_id=quotation["artisan_id"],
        type="order_confirmed",
        title="Order Confirmed!",
        message=f"Quotation {quotation['display_id']} was accepted. Order {display_id} created.",
        metadata={"order_id": order_id, "quotation_id": id}
    )
    
    return {"status": "success", "order_id": order_id}

@router.post("/{id}/reject")
def reject_quotation(id: str, req: QuotationAction, current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    client = get_authenticated_client(token)
    q_res = client.table("quotations").select("*").eq("id", id).execute()
    if not q_res.data or q_res.data[0]["buyer_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    client.table("quotations").update({"status": "rejected"}).eq("id", id).execute()
    client.table("buyer_enquiries").update({"status": "rejected"}).eq("id", q_res.data[0]["enquiry_id"]).execute()
    
    create_notification(
        user_id=q_res.data[0]["artisan_id"],
        type="quote_rejected",
        title="Quotation Rejected",
        message=f"Quotation {q_res.data[0]['display_id']} was rejected by the buyer.",
        metadata={"quotation_id": id, "reason": req.reason if hasattr(req, 'reason') else ""}
    )
    
    return {"status": "success"}

@router.post("/{id}/request-changes")
def request_changes_quotation(id: str, req: QuotationAction, current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    client = get_authenticated_client(token)
    q_res = client.table("quotations").select("*").eq("id", id).execute()
    if not q_res.data or q_res.data[0]["buyer_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    client.table("quotations").update({"status": "changes_requested"}).eq("id", id).execute()
    client.table("buyer_enquiries").update({"status": "changes_requested"}).eq("id", q_res.data[0]["enquiry_id"]).execute()
    
    create_notification(
        user_id=q_res.data[0]["artisan_id"],
        type="quote_change_requested",
        title="Changes Requested",
        message=f"Changes requested for Quotation {q_res.data[0]['display_id']}.",
        metadata={"quotation_id": id, "reason": req.reason if hasattr(req, 'reason') else ""}
    )
    
    return {"status": "success"}

@router.get("/artisan")
def list_artisan_quotations(current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    client = get_authenticated_client(token)
    if current_user.get("role") != "artisan":
        raise HTTPException(status_code=403, detail="Forbidden")
    res = client.table("quotations").select("*, buyer:users!buyer_id(display_name), products(title, images:product_images(image_url))").eq("artisan_id", current_user["id"]).order("created_at", desc=True).execute()
    data = res.data or []
    for q in data:
        q["agreed_variant"] = q.get("variant_snapshot")
    return {"quotations": data}

@router.get("/buyer")
def list_buyer_quotations(current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    client = get_authenticated_client(token)
    res = client.table("quotations").select("*, artisan:users!artisan_id(display_name), products(title, images:product_images(image_url))").eq("buyer_id", current_user["id"]).order("created_at", desc=True).execute()
    data = res.data or []
    for q in data:
        q["agreed_variant"] = q.get("variant_snapshot")
    return {"quotations": data}

@router.get("/by-enquiry/{enquiry_id}")
def get_quotation_by_enquiry(enquiry_id: str, current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    client = get_authenticated_client(token)
    res = client.table("quotations").select("*, buyer:users!buyer_id(display_name), artisan:users!artisan_id(display_name), products(title, images:product_images(image_url))").eq("enquiry_id", enquiry_id).order("created_at", desc=True).limit(1).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Quotation not found for this enquiry")
        
    quotation = res.data[0]
    quotation["agreed_variant"] = quotation.get("variant_snapshot")
    if quotation["buyer_id"] != current_user["id"] and quotation["artisan_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    rev_res = client.table("quotation_revisions").select("*").eq("quotation_id", quotation["id"]).order("version", desc=True).execute()
    order_id = None
    if quotation["status"] == "accepted":
        ord_res = client.table("orders").select("id").eq("quotation_id", quotation["id"]).limit(1).execute()
        if ord_res.data:
            order_id = ord_res.data[0]["id"]

    return {"quotation": quotation, "revisions": rev_res.data or [], "order_id": order_id}

@router.get("/{id}")
def get_quotation(id: str, current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    client = get_authenticated_client(token)
    res = client.table("quotations").select("*, buyer:users!buyer_id(display_name), artisan:users!artisan_id(display_name), products(title, images:product_images(image_url))").eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Quotation not found")
        
    quotation = res.data[0]
    quotation["agreed_variant"] = quotation.get("variant_snapshot")
    if quotation["buyer_id"] != current_user["id"] and quotation["artisan_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    rev_res = client.table("quotation_revisions").select("*").eq("quotation_id", id).order("version", desc=True).execute()
    order_id = None
    if quotation["status"] == "accepted":
        ord_res = client.table("orders").select("id").eq("quotation_id", id).limit(1).execute()
        if ord_res.data:
            order_id = ord_res.data[0]["id"]

    return {"quotation": quotation, "revisions": rev_res.data or [], "order_id": order_id}
