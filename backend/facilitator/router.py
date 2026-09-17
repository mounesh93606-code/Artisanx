from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from auth.dependencies import security
from database import get_authenticated_client
from .schemas import ReviewSubmitRequest, VerificationUpdateRequest
from datetime import datetime
from .service import log_facilitator_activity

router = APIRouter(prefix="/facilitator", tags=["facilitator"])

def verify_facilitator(client, token: str):
    try:
        user_res = client.auth.get_user(token)
        if not user_res or not user_res.user:
            raise HTTPException(status_code=401, detail="Unauthorized")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Unauthorized: {str(e)}")
    
    db_user = client.table("users").select("role").eq("id", user_res.user.id).execute()
    if not db_user.data or db_user.data[0]["role"] != "facilitator":
        raise HTTPException(status_code=403, detail="Forbidden: Facilitator only")
    return user_res.user.id

@router.get("/stats")
def get_stats(token: HTTPAuthorizationCredentials = Depends(security)):
    client = get_authenticated_client(token.credentials)
    verify_facilitator(client, token.credentials)
    
    artisans_count = client.table("users").select("id", count="exact").eq("role", "artisan").execute().count
    
    art_prof = client.table("artisan_profiles").select("id, profile_photo_url, craft_story").execute()
    incomplete = sum(1 for a in art_prof.data if not a.get("profile_photo_url") or not a.get("craft_story"))
    
    products = client.table("products").select("id, status, price, readiness_score").execute()
    total_products = len(products.data)
    draft_products = sum(1 for p in products.data if p.get("status") == "draft")
    missing_pricing = sum(1 for p in products.data if p.get("price") is None)
    
    readiness_scores = [p.get("readiness_score") for p in products.data if p.get("readiness_score") is not None]
    avg_readiness = sum(readiness_scores) / len(readiness_scores) if readiness_scores else 0
    
    enq_res = client.table("buyer_enquiries").select("id", count="exact").execute()
    total_enquiries = enq_res.count if enq_res.count else 0
    pending_enq = client.table("buyer_enquiries").select("id", count="exact").eq("status", "new").execute().count
    open_support_reqs = client.table("support_requests").select("id", count="exact").eq("status", "open").execute().count
    open_disputes = client.table("disputes").select("id", count="exact").eq("status", "open").execute().count
    
    # Delayed orders logic: expected_dispatch_date < now() and status not in terminal states
    delayed_res = client.table("orders").select("id", count="exact").lt("expected_dispatch_date", datetime.utcnow().isoformat()).not_.in_("status", ["dispatched", "delivered", "completed", "cancelled"]).execute()
    delayed_orders = delayed_res.count if delayed_res.count else 0
    
    # Active orders count
    active_res = client.table("orders").select("id", count="exact").in_("status", ["confirmed", "in_production", "ready_for_dispatch"]).execute()
    active_orders = active_res.count if active_res.count else 0
    
    return {
        "total_artisans": artisans_count or 0,
        "incomplete_profiles": incomplete,
        "total_products": total_products,
        "draft_products": draft_products,
        "missing_pricing": missing_pricing,
        "avg_readiness": round(avg_readiness),
        "total_enquiries": total_enquiries,
        "pending_enquiries": pending_enq or 0,
        "open_support_requests": open_support_reqs or 0,
        "open_disputes": open_disputes or 0,
        "delayed_orders": delayed_orders,
        "active_orders": active_orders
    }

@router.get("/artisans")
def list_artisans(token: HTTPAuthorizationCredentials = Depends(security)):
    client = get_authenticated_client(token.credentials)
    verify_facilitator(client, token.credentials)
    
    res = client.table("users").select(
        "id, display_name, artisan_profiles(craft_category, profile_photo_url, verification_status), products(id, readiness_score)"
    ).eq("role", "artisan").execute()
    
    artisans = []
    for u in res.data:
        prods = u.get("products") or []
        scores = [p.get("readiness_score") or 0 for p in prods]
        avg = sum(scores)/len(scores) if scores else 0
        
        prof = (u.get("artisan_profiles") or [{}])[0] if u.get("artisan_profiles") else {}
        
        artisans.append({
            "id": u["id"],
            "name": u.get("display_name"),
            "craft": prof.get("craft_category"),
            "photo": prof.get("profile_photo_url"),
            "status": prof.get("verification_status"),
            "product_count": len(prods),
            "avg_readiness": round(avg)
        })
    return {"artisans": artisans}

@router.get("/artisans/{id}")
def get_artisan(id: str, token: HTTPAuthorizationCredentials = Depends(security)):
    client = get_authenticated_client(token.credentials)
    verify_facilitator(client, token.credentials)
    
    # Get user and profile
    res = client.table("users").select(
        "id, display_name, artisan_profiles(craft_category, profile_photo_url, verification_status, craft_story, location)"
    ).eq("id", id).eq("role", "artisan").execute()
    
    if not res.data:
        raise HTTPException(status_code=404, detail="Artisan not found")
        
    u = res.data[0]
    prof = (u.get("artisan_profiles") or [{}])[0] if u.get("artisan_profiles") else {}
    
    # Get products
    prods = client.table("products").select("id, title, status, readiness_score, price, product_images(image_url)").eq("artisan_id", id).execute()
    
    # Get orders
    orders_res = client.table("orders").select("*, buyer:users!buyer_id(display_name)").eq("artisan_id", id).order("created_at", desc=True).execute()
    all_orders = orders_res.data or []
    completed_orders = [o for o in all_orders if o.get("status") == "completed"]
    
    # Get buyer reviews
    reviews_res = client.table("buyer_reviews").select("*, buyer:users!buyer_id(display_name)").eq("artisan_id", id).order("created_at", desc=True).execute()
    buyer_feedback = reviews_res.data or []
    
    return {
        "id": u["id"],
        "name": u.get("display_name"),
        "craft": prof.get("craft_category"),
        "photo": prof.get("profile_photo_url"),
        "status": prof.get("verification_status"),
        "story": prof.get("craft_story"),
        "location": prof.get("location"),
        "products": prods.data or [],
        "orders": all_orders,
        "completed_orders": completed_orders,
        "buyer_feedback": buyer_feedback,
        "documents": []
    }

@router.put("/artisans/{id}/verification")
def update_verification(id: str, req: VerificationUpdateRequest, token: HTTPAuthorizationCredentials = Depends(security)):
    client = get_authenticated_client(token.credentials)
    verify_facilitator(client, token.credentials)
    
    allowed_statuses = ["self_declared", "facilitator_reviewed", "cooperative_verified", "documentation_pending"]
    if req.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Invalid verification status")
        
    client.table("artisan_profiles").update({"verification_status": req.status}).eq("id", id).execute()
    log_facilitator_activity(verify_facilitator(client, token.credentials), "verification_changed", "artisan", id, f"Status updated to {req.status}")
    return {"status": "success", "verification_status": req.status}


@router.get("/products/issues")
def list_product_issues(token: HTTPAuthorizationCredentials = Depends(security)):
    client = get_authenticated_client(token.credentials)
    verify_facilitator(client, token.credentials)
    
    res = client.table("products").select(
        "id, title, status, price, stock_quantity, readiness_score, artisan:users!artisan_id(display_name), images:product_images(image_url)"
    ).execute()
    
    reviews_res = client.table("facilitator_reviews").select("*").execute()
    review_map = {r["product_id"]: r for r in (reviews_res.data or [])}
    
    issues = []
    for p in res.data:
        missing = []
        if p.get("price") is None: missing.append("missing_price")
        if p.get("stock_quantity") is None or p.get("stock_quantity") == 0: missing.append("missing_stock")
        if not p.get("images"): missing.append("missing_image")
        if (p.get("readiness_score") or 0) < 70: missing.append("low_readiness")
        
        rev = review_map.get(p["id"], {})
        rev_status = rev.get("review_status", "pending")
        
        issues.append({
            "product_id": p["id"],
            "title": p.get("title"),
            "price": p.get("price"),
            "image": p.get("images")[0]["image_url"] if p.get("images") else None,
            "artisan_name": p.get("artisan", {}).get("display_name") if p.get("artisan") else None,
            "readiness_score": p.get("readiness_score") or 0,
            "missing": missing,
            "review_status": rev_status,
            "review_notes": rev.get("notes"),
            "review_flags": rev.get("flags")
        })
            
    issues.sort(key=lambda x: x["readiness_score"])
    return {"issues": issues}

@router.get("/enquiries")
def list_enquiries(token: HTTPAuthorizationCredentials = Depends(security)):
    client = get_authenticated_client(token.credentials)
    verify_facilitator(client, token.credentials)
    
    res = client.table("buyer_enquiries").select(
        "*, products(title), artisan:users!artisan_id(display_name), buyer:users!buyer_id(display_name)"
    ).order("created_at", desc=True).execute()
    return {"enquiries": res.data}

@router.post("/review/{product_id}")
def submit_review(product_id: str, req: ReviewSubmitRequest, token: HTTPAuthorizationCredentials = Depends(security)):
    client = get_authenticated_client(token.credentials)
    fac_id = verify_facilitator(client, token.credentials)
    
    review_data = {
        "facilitator_id": fac_id,
        "product_id": product_id,
        "review_status": req.review_status,
        "notes": req.notes,
        "flags": req.flags,
        "reviewed_at": datetime.utcnow().isoformat()
    }
    
    existing = client.table("facilitator_reviews").select("id").eq("product_id", product_id).execute()
    if existing.data:
        client.table("facilitator_reviews").update(review_data).eq("id", existing.data[0]["id"]).execute()
    else:
        client.table("facilitator_reviews").insert(review_data).execute()
        
    if req.review_status == "needs_changes":
        prod_res = client.table("products").select("artisan_id").eq("id", product_id).execute()
        if prod_res.data:
            artisan_id = prod_res.data[0].get("artisan_id")
            from notifications.service import create_notification
            create_notification(
                user_id=artisan_id,
                type="correction_requested",
                title="Product Correction Requested",
                message="A facilitator has requested changes to your product.",
                metadata={"product_id": product_id, "flags": req.flags, "notes": req.notes}
            )
            log_facilitator_activity(fac_id, "correction_requested", "product", product_id, req.notes)
            if req.flags and len(req.flags) > 0:
                log_facilitator_activity(fac_id, "product_flagged", "product", product_id, f"Flags: {', '.join(req.flags)}")
    elif req.review_status == "approved":
        log_facilitator_activity(fac_id, "product_approved", "product", product_id, "Product review approved")
    else:
        log_facilitator_activity(fac_id, "product_reviewed", "product", product_id, f"Status: {req.review_status}")
            
    return {"status": "success"}

@router.get("/orders")
def get_orders(token: HTTPAuthorizationCredentials = Depends(security)):
    client = get_authenticated_client(token.credentials)
    verify_facilitator(client, token.credentials)
    
    # Active orders
    active_res = client.table("orders").select("*, artisan:users!artisan_id(display_name), buyer:users!buyer_id(display_name)").in_("status", ["confirmed", "in_production", "ready_for_dispatch"]).execute()
    
    # Delayed orders
    delayed_res = client.table("orders").select("*, artisan:users!artisan_id(display_name), buyer:users!buyer_id(display_name)").lt("expected_dispatch_date", datetime.utcnow().isoformat()).not_.in_("status", ["dispatched", "delivered", "completed", "cancelled"]).execute()
    
    # Cancellation requests
    cancel_res = client.table("orders").select("*, artisan:users!artisan_id(display_name), buyer:users!buyer_id(display_name)").eq("status", "cancellation_requested").execute()
    
    # Open disputes orders
    disputes_res = client.table("disputes").select("order_id").eq("status", "open").execute()
    disputed_order_ids = [d["order_id"] for d in disputes_res.data] if disputes_res.data else []
    
    disputed_orders = []
    if disputed_order_ids:
        d_orders_res = client.table("orders").select("*, artisan:users!artisan_id(display_name), buyer:users!buyer_id(display_name)").in_("id", disputed_order_ids).execute()
        disputed_orders = d_orders_res.data
        
    return {
        "active_orders": active_res.data,
        "delayed_orders": delayed_res.data,
        "cancellation_requests": cancel_res.data,
        "disputed_orders": disputed_orders
    }

@router.get("/artisans/{id}/performance")
def get_artisan_performance(id: str, token: HTTPAuthorizationCredentials = Depends(security)):
    client = get_authenticated_client(token.credentials)
    verify_facilitator(client, token.credentials)
    
    # Fetch orders for artisan
    orders_res = client.table("orders").select("status, created_at").eq("artisan_id", id).execute()
    orders = orders_res.data or []
    
    total_orders = len(orders)
    completed_orders = sum(1 for o in orders if o["status"] == "completed")
    cancelled_orders = sum(1 for o in orders if o["status"] == "cancelled")
    
    cancellation_rate = "Not enough data"
    if total_orders > 0:
        cancellation_rate = f"{round((cancelled_orders / total_orders) * 100)}%"
        
    # We don't have accurate enough delivery timestamps in dummy data for on-time completion right now.
    on_time_completion = "Not enough data"
    
    # Reviews
    reviews_res = client.table("buyer_reviews").select("rating").eq("artisan_id", id).execute()
    reviews = reviews_res.data or []
    avg_rating = "Not enough data"
    if reviews:
        avg_rating = round(sum(r["rating"] for r in reviews) / len(reviews), 1)
        
    # Disputes
    disputes_res = client.table("disputes").select("id").eq("artisan_id", id).eq("status", "open").execute()
    active_disputes = len(disputes_res.data or [])
    
    return {
        "completed_orders": completed_orders,
        "cancelled_orders": cancelled_orders,
        "cancellation_rate": cancellation_rate,
        "on_time_completion": on_time_completion,
        "avg_rating": avg_rating,
        "active_disputes": active_disputes
    }

@router.get("/activity")
def get_activity_log(token: HTTPAuthorizationCredentials = Depends(security)):
    client = get_authenticated_client(token.credentials)
    verify_facilitator(client, token.credentials)
    
    from database import get_service_client
    svc = get_service_client()
    res = svc.table("facilitator_activities").select("*, facilitator:users!facilitator_id(display_name)").order("created_at", desc=True).limit(50).execute()
    return {"activities": res.data or []}
