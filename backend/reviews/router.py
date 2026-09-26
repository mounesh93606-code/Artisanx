from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from auth.dependencies import get_current_user, get_token
from database import get_service_client
from .schemas import ReviewCreate
from notifications.service import create_notification

router = APIRouter(prefix="/reviews", tags=["reviews"])

@router.post("")
@router.post("/")
@router.post("/buyer")
def create_review(req: ReviewCreate, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    if current_user.get("role") != "buyer":
        raise HTTPException(status_code=403, detail="Only buyers can submit reviews")
        
    service_client = get_service_client()
    
    # Check if order exists and belongs to user
    ord_res = service_client.table("orders").select("*").eq("id", req.order_id).execute()
    if not ord_res.data or ord_res.data[0]["buyer_id"] != user_id:
        raise HTTPException(status_code=404, detail="Order not found")
        
    order = ord_res.data[0]
    
    # If order was dispatched or delivered, auto-mark as completed
    if order["status"] in ["dispatched", "delivered"]:
        service_client.table("orders").update({"status": "completed"}).eq("id", req.order_id).execute()
        order["status"] = "completed"
        
    if order["status"] != "completed":
        raise HTTPException(status_code=400, detail="Reviews can only be submitted for completed orders")

    # Check if review already exists for this order
    existing = service_client.table("buyer_reviews").select("id").eq("order_id", req.order_id).execute()
    
    review_data = {
        "order_id": req.order_id,
        "product_id": order["product_id"],
        "artisan_id": order["artisan_id"],
        "buyer_id": user_id,
        "rating_overall": req.rating_overall,
        "rating_quality": req.rating_quality,
        "rating_communication": req.rating_communication,
        "rating_timeliness": req.rating_timeliness,
        "review_text": req.review_text,
        "is_verified_buyer": True,
        "created_at": datetime.utcnow().isoformat()
    }
    
    if existing.data and len(existing.data) > 0:
        # Update existing review
        rev_id = existing.data[0]["id"]
        r_res = service_client.table("buyer_reviews").update(review_data).eq("id", rev_id).execute()
    else:
        # Insert new review
        r_res = service_client.table("buyer_reviews").insert(review_data).execute()
        
    if not r_res.data:
        raise HTTPException(status_code=500, detail="Failed to save review")
        
    # Send notification to artisan
    try:
        prod_res = service_client.table("products").select("title").eq("id", order["product_id"]).execute()
        product_title = prod_res.data[0]["title"] if prod_res.data else "a product"
        create_notification(
            user_id=order["artisan_id"],
            type="review_received",
            title=f"New {req.rating_overall}-star Review!",
            message=f"You received a new review for {product_title}.",
            metadata={"review_id": r_res.data[0]["id"], "order_id": req.order_id, "rating": req.rating_overall}
        )
    except Exception as e:
        print("Failed to send review notification:", e)
    
    return {"status": "success", "review": r_res.data[0]}

@router.get("/product/{product_id}")
def get_product_reviews(product_id: str, days: int = Query(default=30, description="Filter for reviews within the past N days (default 30 for 1 month)")):
    client = get_service_client()
    cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
    
    try:
        all_res = client.table("buyer_reviews").select("*").eq("product_id", product_id).order("created_at", desc=True).execute()
        all_reviews = all_res.data or []
        
        # Enrich each review with buyer info
        buyer_ids = list(set([r["buyer_id"] for r in all_reviews if r.get("buyer_id")]))
        user_map = {}
        if buyer_ids:
            u_res = client.table("users").select("id, display_name, email").in_("id", buyer_ids).execute()
            for u in (u_res.data or []):
                name = u.get("display_name") or (u.get("email", "").split("@")[0].capitalize() if u.get("email") else "Verified Buyer")
                user_map[u["id"]] = {"display_name": name}
                
        for r in all_reviews:
            r["buyer"] = user_map.get(r.get("buyer_id"), {"display_name": "Verified Buyer"})
            
        recent_reviews = [r for r in all_reviews if r.get("created_at", "") >= cutoff]
    except Exception as e:
        print("Error fetching product reviews:", e)
        recent_reviews = []
        all_reviews = []
        
    total = len(all_reviews)
    agg = {
        "overall": round(sum(r.get("rating_overall", 0) for r in all_reviews) / total, 1) if total > 0 else 0,
        "quality": round(sum(r.get("rating_quality", 0) for r in all_reviews) / total, 1) if total > 0 else 0,
        "communication": round(sum(r.get("rating_communication", 0) for r in all_reviews) / total, 1) if total > 0 else 0,
        "timeliness": round(sum(r.get("rating_timeliness", 0) for r in all_reviews) / total, 1) if total > 0 else 0
    }
    
    return {
        "reviews": recent_reviews, # past 1 month (30 days)
        "all_reviews": all_reviews,
        "total_reviews": total,
        "recent_reviews_count": len(recent_reviews),
        "days_filter": days,
        "aggregates": agg
    }

@router.get("/artisan")
def get_artisan_reviews(current_user: dict = Depends(get_current_user)):
    client = get_service_client()
    
    res = client.table("buyer_reviews").select("*").eq("artisan_id", current_user["id"]).order("created_at", desc=True).execute()
    reviews = res.data or []
    
    # Enrich with product title and buyer name
    for r in reviews:
        if r.get("product_id"):
            p = client.table("products").select("title").eq("id", r["product_id"]).execute()
            if p.data:
                r["products"] = p.data[0]
        if r.get("buyer_id"):
            u = client.table("users").select("display_name, email").eq("id", r["buyer_id"]).execute()
            if u.data:
                name = u.data[0].get("display_name") or (u.data[0].get("email", "").split("@")[0].capitalize() if u.data[0].get("email") else "Verified Buyer")
                r["buyer"] = {"display_name": name}
    
    total = len(reviews)
    agg = {
        "overall": 0,
        "quality": 0,
        "communication": 0,
        "timeliness": 0
    }
    
    if total > 0:
        agg["overall"] = round(sum(r.get("rating_overall", 0) for r in reviews) / total, 1)
        agg["quality"] = round(sum(r.get("rating_quality", 0) for r in reviews) / total, 1)
        agg["communication"] = round(sum(r.get("rating_communication", 0) for r in reviews) / total, 1)
        agg["timeliness"] = round(sum(r.get("rating_timeliness", 0) for r in reviews) / total, 1)
        
    return {
        "reviews": reviews,
        "aggregates": agg,
        "total_reviews": total
    }
