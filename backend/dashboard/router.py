# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
from auth.dependencies import get_current_user, get_token
from database import get_authenticated_client

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

import traceback

@router.get("/artisan")
def get_artisan_dashboard(current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    try:
        client = get_authenticated_client(token)
        if current_user.get("role") != "artisan":
            raise HTTPException(status_code=403, detail="Forbidden")
            
        artisan_id = current_user["id"]

        
        # Total and Published Products
        prod_res = client.table("products").select("status").eq("artisan_id", artisan_id).execute()
        products = prod_res.data or []
        total_products = len(products)
        published_products = sum(1 for p in products if p["status"] == "published")
        
        # New Enquiries
        enq_res = client.table("buyer_enquiries").select("id").eq("artisan_id", artisan_id).eq("status", "new").execute()
        new_enquiries = len(enq_res.data or [])
        
        # Pending Quotations
        quot_res = client.table("quotations").select("id").eq("artisan_id", artisan_id).in_("status", ["draft", "changes_requested"]).execute()
        pending_quotations = len(quot_res.data or [])
        
        # Orders
        ord_res = client.table("orders").select("status, total_order_value").eq("artisan_id", artisan_id).execute()
        orders = ord_res.data or []
        
        active_orders = sum(1 for o in orders if o["status"] not in ["completed", "cancelled", "returned"])
        completed_orders = sum(1 for o in orders if o["status"] == "completed")
        cancelled_orders = sum(1 for o in orders if o["status"] == "cancelled")
        
        # Rates
        total_orders = len(orders)
        completion_rate = 0
        cancellation_rate = 0
        on_time_rate = 0
        returned_disputed_orders = sum(1 for o in orders if o["status"] in ["return_requested", "returned", "disputed"])

        if total_orders > 0:
            completion_rate = (completed_orders / total_orders) * 100
            cancellation_rate = (cancelled_orders / total_orders) * 100
            
            # On-time completion rate:
            # We would need to check history for 'completed' date vs 'expected_completion_date'.
            # For simplicity, we just count completed orders that have expected_completion_date > order_date (placeholder logic)
            # A more robust check: compare actual_dispatch_date vs expected_dispatch_date
            on_time_dispatches = sum(1 for o in orders if o["status"] in ["dispatched", "delivered", "completed"] and o.get("actual_dispatch_date") and o.get("expected_dispatch_date") and o["actual_dispatch_date"] <= o["expected_dispatch_date"])
            dispatched_total = sum(1 for o in orders if o["status"] in ["dispatched", "delivered", "completed"])
            on_time_rate = (on_time_dispatches / dispatched_total * 100) if dispatched_total > 0 else 100
            
        total_order_value = sum(parse_value(o.get("total_order_value")) for o in orders if o["status"] not in ["cancelled", "return_requested", "returned", "disputed"])

        
        # Recent Activity (Last 5 order history changes)
        # We fetch recent history directly for this artisan's orders
        order_res = client.table("orders").select("id, display_id").eq("artisan_id", artisan_id).execute()
        orders_data = order_res.data or []
        order_map = {o["id"]: o for o in orders_data}
        order_ids = list(order_map.keys())
        
        recent_activity = []
        if order_ids:
            hist_res = client.table("order_status_history").select("*").in_("order_id", order_ids).order("created_at", desc=True).limit(5).execute()
            for activity in (hist_res.data or []):
                activity["orders"] = order_map.get(activity["order_id"], {})
                recent_activity.append(activity)
        
        return {
            "total_products": total_products,
            "published_products": published_products,
            "new_enquiries": new_enquiries,
            "pending_quotations": pending_quotations,
            "orders": {
                "active": active_orders,
                "completed": completed_orders,
                "cancelled": cancelled_orders,
                "returned": returned_disputed_orders,
                "total_value": total_order_value,
                "completion_rate": round(completion_rate, 1),
                "cancellation_rate": round(cancellation_rate, 1),
                "on_time_rate": round(on_time_rate, 1)
            },
            "recent_activity": recent_activity
        }
    except HTTPException:
        raise
    except Exception as e:
        trace = traceback.format_exc()
        print("Dashboard Exception:", trace)
        raise HTTPException(status_code=500, detail=f"Error: {str(e)} \nTrace: {trace}")
