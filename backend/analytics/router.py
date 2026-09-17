from fastapi import APIRouter, Depends, HTTPException
from auth.dependencies import get_current_user, get_token, security
from database import get_authenticated_client
from .schemas import TrackEventReq
from datetime import datetime, timedelta
import traceback

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.post("/track")
def track_event(req: TrackEventReq, token: str = Depends(security)):
    # Using raw token to get client since buyer might not be logged in fully for public passport views
    # but we will try to resolve the user if possible
    try:
        from auth.dependencies import verify_token
        user = verify_token(token.credentials)
        client = get_authenticated_client(token.credentials)
        buyer_id = user.get("id")
    except:
        from database import supabase_client
        client = supabase_client
        buyer_id = None
        
    data = {
        "product_id": req.product_id,
        "event_type": req.event_type,
        "metadata": req.metadata,
        "buyer_id": buyer_id
    }
    try:
        from database import get_service_client
        get_service_client().table("product_analytics_events").insert(data).execute()
    except Exception as e:
        print(f"Warning: Failed to log analytics event: {e}")
    return {"status": "success"}

@router.get("/artisan/performance")
def get_artisan_performance(current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    from database import get_service_client
    client = get_authenticated_client(token)
    service_client = get_service_client()

    if current_user.get("role") != "artisan":
        raise HTTPException(status_code=403, detail="Forbidden")
        
    artisan_id = current_user["id"]
    
    empty_result = {
        "total_views": 0,
        "total_passport_views": 0,
        "total_saves": 0,
        "total_enquiries": 0,
        "total_orders": 0,
        "conversion_rate": 0,
        "top_products": []
    }

    try:
        prod_res = client.table("products").select("id, title, status").eq("artisan_id", artisan_id).execute()
        products = {p["id"]: p for p in (prod_res.data or [])}
        product_ids = list(products.keys())
        
        if not product_ids:
            return empty_result
            
        # Fetch events for these products using service_client to prevent RLS permission errors
        events = []
        try:
            events_res = service_client.table("product_analytics_events").select("*").in_("product_id", product_ids).execute()
            events = events_res.data or []
        except Exception as ev_err:
            print(f"Warning: Failed to fetch analytics events: {ev_err}")
        
        total_views = 0
        total_passport_views = 0
        total_saves = 0
        
        prod_stats = {pid: {"title": products[pid]["title"], "views": 0, "enquiries": 0, "orders": 0} for pid in product_ids}
        
        for e in events:
            pid = e.get("product_id")
            if not pid or pid not in prod_stats: continue
            
            ev_type = e.get("event_type")
            if ev_type == "view":
                total_views += 1
                prod_stats[pid]["views"] += 1
            elif ev_type == "passport_view":
                total_passport_views += 1
                prod_stats[pid]["views"] += 1
            elif ev_type == "save":
                total_saves += 1
                
        # Fetch enquiries and orders
        enquiries = []
        try:
            enq_res = client.table("buyer_enquiries").select("product_id").in_("product_id", product_ids).execute()
            enquiries = enq_res.data or []
            for enq in enquiries:
                pid = enq.get("product_id")
                if pid and pid in prod_stats:
                    prod_stats[pid]["enquiries"] += 1
        except Exception as enq_err:
            print(f"Warning: Failed to fetch enquiries for analytics: {enq_err}")
                
        orders = []
        try:
            ord_res = client.table("orders").select("product_id").in_("product_id", product_ids).execute()
            orders = ord_res.data or []
            for o in orders:
                pid = o.get("product_id")
                if pid and pid in prod_stats:
                    prod_stats[pid]["orders"] += 1
        except Exception as ord_err:
            print(f"Warning: Failed to fetch orders for analytics: {ord_err}")
                
        # Sort top products by engagement
        sorted_products = sorted(prod_stats.values(), key=lambda x: x["views"] + x["enquiries"] * 5 + x["orders"] * 10, reverse=True)
        
        return {
            "total_views": total_views,
            "total_passport_views": total_passport_views,
            "total_saves": total_saves,
            "total_enquiries": len(enquiries),
            "total_orders": len(orders),
            "conversion_rate": round(len(orders) / total_views * 100, 1) if total_views > 0 else 0,
            "top_products": sorted_products[:5]
        }
    except Exception as err:
        print(f"Error computing artisan performance: {err}")
        traceback.print_exc()
        return empty_result

