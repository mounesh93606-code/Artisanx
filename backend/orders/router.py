from fastapi import APIRouter, Depends, HTTPException
from auth.dependencies import get_current_user, get_token
from database import get_authenticated_client, get_service_client
from .schemas import OrderStatusUpdate, CancelOrderRequest, OrderCreate, CheckoutBatchRequest
from datetime import datetime
from notifications.service import create_notification
import random
import string

router = APIRouter(prefix="/orders", tags=["orders"])

def generate_display_id(prefix: str = "AX-ORD"):
    rand_str = ''.join(random.choices(string.digits, k=5))
    return f"{prefix}-{rand_str}"

VALID_TRANSITIONS = {
    "confirmed": ["in_production", "cancellation_requested", "cancelled"],
    "in_production": ["ready_for_dispatch", "cancellation_requested", "cancelled"],
    "ready_for_dispatch": ["dispatched", "cancelled"],
    "dispatched": ["delivered", "return_requested"],
    "delivered": ["completed", "return_requested"],
    "return_requested": ["returned", "disputed"],
    "cancellation_requested": ["cancelled", "in_production"] # Can reject cancellation
}

def create_single_order(client, current_user, item, delivery_address=None, notes=None):
    buyer_id = current_user["id"]
    service_client = get_service_client()
    if current_user.get("role") != "buyer":
        raise HTTPException(status_code=403, detail="Unauthorized: Only buyers can place orders")

    prod_res = client.table("products").select("*").eq("id", item.product_id).execute()
    if not prod_res.data:
        raise HTTPException(status_code=404, detail="Product not found")
    product = prod_res.data[0]

    if product.get("status") != "published":
        raise HTTPException(status_code=400, detail="Product is currently unavailable for purchase")

    # Business Rule: Check Enquiry & Artisan Confirmation
    if item.enquiry_id:
        enq_res = client.table("buyer_enquiries").select("*").eq("id", item.enquiry_id).execute()
        if not enq_res.data:
            raise HTTPException(status_code=404, detail="Referenced enquiry not found")
        enquiry = enq_res.data[0]
        if enquiry.get("buyer_id") != buyer_id or enquiry.get("product_id") != item.product_id:
            raise HTTPException(status_code=403, detail="Invalid enquiry reference for this product/buyer")
        
        # Check rejection
        if enquiry.get("status") == "rejected" or enquiry.get("artisan_response") in ["cannot_fulfil", "rejected"]:
            raise HTTPException(status_code=400, detail="Artisan did not confirm this request.")
        
        # Check pending
        is_confirmed = (enquiry.get("status") in ["accepted", "responded"] and enquiry.get("artisan_response") in ["accepted", "interested"]) or enquiry.get("status") == "quote_sent"
        if not is_confirmed:
            raise HTTPException(status_code=400, detail="Enquiry is waiting for artisan confirmation.")
    else:
        # If no enquiry_id explicitly provided, check if product requires enquiry confirmation
        if product.get("is_made_to_order") or product.get("customisation_available"):
            check_enq = client.table("buyer_enquiries").select("*").eq("buyer_id", buyer_id).eq("product_id", item.product_id).execute()
            confirmed = [e for e in (check_enq.data or []) if (e.get("status") in ["accepted", "responded"] and e.get("artisan_response") in ["accepted", "interested"]) or e.get("status") == "quote_sent"]
            if not confirmed:
                raise HTTPException(status_code=400, detail="This product requires artisan confirmation before placing an order. Please send an enquiry first.")
            item.enquiry_id = confirmed[0]["id"]

    moq = product.get("moq") or 1
    if item.quantity < moq:
        raise HTTPException(status_code=400, detail=f"Minimum order quantity is {moq}")

    if product.get("stock_quantity") is not None and not product.get("is_made_to_order"):
        if item.quantity > product["stock_quantity"]:
            raise HTTPException(status_code=400, detail=f"Requested quantity ({item.quantity}) exceeds available stock ({product['stock_quantity']})")

    unit_price = float(product.get("price") or 0)
    if item.variant and item.variant.get("price_adjustment"):
        unit_price += float(item.variant.get("price_adjustment", 0))

    total_order_value = round(unit_price * item.quantity, 2)

    # Fetch main image
    img_res = client.table("product_images").select("image_url").eq("product_id", item.product_id).order("sort_order").execute()
    img_url = img_res.data[0]["image_url"] if (img_res.data and len(img_res.data) > 0) else ""

    product_snapshot = {
        "product_id": item.product_id,
        "title": product.get("title", "Product"),
        "description": product.get("description", ""),
        "category": product.get("category", ""),
        "price": unit_price,
        "image_url": img_url,
        "artisan_id": product["artisan_id"],
        "materials": product.get("materials"),
        "dimensions": product.get("dimensions"),
        "variant": item.variant,
        "delivery_address": delivery_address,
        "buyer_notes": notes
    }

    display_id = generate_display_id()

    customization = item.customization_details or (notes if notes else None)

    order_data = {
        "display_id": display_id,
        "enquiry_id": item.enquiry_id,
        "product_id": item.product_id,
        "buyer_id": buyer_id,
        "artisan_id": product["artisan_id"],
        "status": "confirmed",
        "quantity": item.quantity,
        "unit_price": unit_price,
        "total_order_value": total_order_value,
        "customization_details": customization,
        "product_snapshot": product_snapshot
    }

    ord_res = service_client.table("orders").insert(order_data).execute()
    if not ord_res.data:
        raise HTTPException(status_code=500, detail="Failed to create order")
    created_order = ord_res.data[0]
    order_id = created_order["id"]

    # Insert status history
    hist_data = {
        "order_id": order_id,
        "from_status": None,
        "to_status": "confirmed",
        "changed_by": buyer_id,
        "note": "Order placed successfully by buyer"
    }
    service_client.table("order_status_history").insert(hist_data).execute()

    # Deduct stock if tracked
    if product.get("stock_quantity") is not None and not product.get("is_made_to_order"):
        new_stock = max(0, product["stock_quantity"] - item.quantity)
        service_client.table("products").update({"stock_quantity": new_stock}).eq("id", item.product_id).execute()

    # Notifications
    try:
        create_notification(
            user_id=product["artisan_id"],
            type="order_confirmed",
            title="New Order Received!",
            message=f"Order {display_id} placed for {product.get('title', 'Product')}.",
            metadata={"order_id": order_id, "display_id": display_id, "product_id": item.product_id}
        )
        create_notification(
            user_id=buyer_id,
            type="order_confirmed",
            title="Order Placed Successfully!",
            message=f"Your order {display_id} has been confirmed.",
            metadata={"order_id": order_id, "display_id": display_id, "product_id": item.product_id}
        )
    except Exception as e:
        print(f"Warning: failed to send order notification: {e}")

    return created_order

@router.post("/")
def create_order(req: OrderCreate, current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    client = get_authenticated_client(token)
    order = create_single_order(client, current_user, req, req.delivery_address, req.notes)
    return {"status": "success", "order": order, "order_id": order["id"], "display_id": order["display_id"]}

@router.post("/checkout")
def checkout_batch(req: CheckoutBatchRequest, current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    if not req.items or len(req.items) == 0:
        raise HTTPException(status_code=400, detail="Checkout items cannot be empty")
    client = get_authenticated_client(token)
    created_orders = []
    for item in req.items:
        ord = create_single_order(client, current_user, item, req.delivery_address, req.notes)
        created_orders.append(ord)
    return {
        "status": "success",
        "orders": created_orders,
        "order_ids": [o["id"] for o in created_orders],
        "display_ids": [o["display_id"] for o in created_orders]
    }

@router.get("/artisan")
def list_artisan_orders(current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    client = get_authenticated_client(token)
    if current_user.get("role") != "artisan":
        raise HTTPException(status_code=403, detail="Forbidden")
    res = client.table("orders").select("*, buyer:users!buyer_id(display_name)").eq("artisan_id", current_user["id"]).order("created_at", desc=True).execute()
    return {"orders": res.data}

@router.get("/buyer")
def list_buyer_orders(current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    client = get_authenticated_client(token)
    res = client.table("orders").select("*, artisan:users!artisan_id(display_name)").eq("buyer_id", current_user["id"]).order("created_at", desc=True).execute()
    return {"orders": res.data}

@router.get("/{id}")
def get_order(id: str, current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    client = get_authenticated_client(token)
    res = client.table("orders").select("*, buyer:users!buyer_id(display_name), artisan:users!artisan_id(display_name)").eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Order not found")
        
    order = res.data[0]
    if order["buyer_id"] != current_user["id"] and order["artisan_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    hist_res = client.table("order_status_history").select("*, changed_by_user:users!changed_by(display_name)").eq("order_id", id).order("created_at", desc=False).execute()
    return {"order": order, "history": hist_res.data}

@router.patch("/{id}/status")
def update_order_status(id: str, req: OrderStatusUpdate, current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    client = get_authenticated_client(token)
    res = client.table("orders").select("*").eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Order not found")
        
    order = res.data[0]
    is_artisan = (order["artisan_id"] == current_user["id"])
    is_buyer = (order["buyer_id"] == current_user["id"])
    
    if not is_artisan and not is_buyer:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    current_status = order["status"]
    new_status = req.status
    
    if current_status not in VALID_TRANSITIONS or new_status not in VALID_TRANSITIONS[current_status]:
        raise HTTPException(status_code=400, detail=f"Invalid transition from {current_status} to {new_status}")
        
    # Artisan specific transitions
    artisan_only = ["in_production", "ready_for_dispatch", "dispatched"]
    if new_status in artisan_only and not is_artisan:
        raise HTTPException(status_code=403, detail="Only artisan can set this status")
        
    buyer_only = ["completed", "cancellation_requested", "return_requested"]
    if new_status in buyer_only and not is_buyer:
        raise HTTPException(status_code=403, detail="Only buyer can set this status")
        
    # Update order
    update_data = {"status": new_status}
    if new_status == "dispatched":
        update_data["actual_dispatch_date"] = datetime.utcnow().isoformat()
        
    service_client = get_service_client()
    service_client.table("orders").update(update_data).eq("id", id).execute()
    
    # Insert history
    hist_data = {
        "order_id": id,
        "from_status": current_status,
        "to_status": new_status,
        "changed_by": current_user["id"],
        "note": req.note
    }
    service_client.table("order_status_history").insert(hist_data).execute()

    # Dispatch notification to the other party
    try:
        if is_artisan:
            create_notification(
                user_id=order["buyer_id"],
                type="order_status_update",
                title="Order Status Updated",
                message=f"Order {order['display_id']} status updated to {new_status.replace('_', ' ')}.",
                metadata={"order_id": id, "status": new_status}
            )
        elif is_buyer:
            create_notification(
                user_id=order["artisan_id"],
                type="order_status_update",
                title="Order Update from Buyer",
                message=f"Order {order['display_id']} was updated to {new_status.replace('_', ' ')} by the buyer.",
                metadata={"order_id": id, "status": new_status}
            )
    except Exception as e:
        print(f"Warning: Failed to create order status notification: {e}")
    
    return {"status": "success", "new_status": new_status}

@router.post("/{id}/cancel")
def request_cancel_order(id: str, req: CancelOrderRequest, current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    client = get_authenticated_client(token)
    res = client.table("orders").select("*").eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Order not found")
        
    order = res.data[0]
    is_artisan = (order["artisan_id"] == current_user["id"])
    is_buyer = (order["buyer_id"] == current_user["id"])
    
    if not is_artisan and not is_buyer:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    current_status = order["status"]
    
    if current_status in ["cancelled", "completed", "delivered", "dispatched", "return_requested", "returned", "disputed"]:
        raise HTTPException(status_code=400, detail="Order cannot be cancelled at this stage")
        
    # Artisan cancellation is immediate. Buyer cancellation requires review.
    new_status = "cancelled" if is_artisan else "cancellation_requested"
    role = "artisan" if is_artisan else "buyer"
    
    # Insert cancellation record
    cancel_data = {
        "order_id": id,
        "cancelled_by_role": role,
        "cancelled_by_user": current_user["id"],
        "reason": req.reason,
        "notes": req.notes,
        "previous_status": current_status
    }
    client.table("order_cancellations").insert(cancel_data).execute()
    
    # Update order
    client.table("orders").update({"status": new_status}).eq("id", id).execute()
    
    # Insert history
    hist_data = {
        "order_id": id,
        "from_status": current_status,
        "to_status": new_status,
        "changed_by": current_user["id"],
        "note": f"Cancellation reason: {req.reason}"
    }
    client.table("order_status_history").insert(hist_data).execute()
    
    # Notify
    if is_artisan:
        create_notification(
            user_id=order["buyer_id"],
            type="cancellation",
            title="Order Cancelled",
            message=f"Order {order['display_id']} was cancelled by the artisan.",
            metadata={"order_id": id, "reason": req.reason}
        )
    else:
        create_notification(
            user_id=order["artisan_id"],
            type="cancellation_request",
            title="Cancellation Requested",
            message=f"Buyer requested to cancel Order {order['display_id']}.",
            metadata={"order_id": id, "reason": req.reason}
        )
        
    return {"status": "success", "new_status": new_status}

@router.post("/{id}/cancel_decision")
def decision_cancel_order(id: str, decision: dict, current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    # decision = {"approved": bool, "note": str}
    client = get_authenticated_client(token)
    res = client.table("orders").select("*").eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Order not found")
        
    order = res.data[0]
    if order["artisan_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only artisan can approve/reject cancellations")
        
    if order["status"] != "cancellation_requested":
        raise HTTPException(status_code=400, detail="Order is not pending cancellation")
        
    # Find previous status from cancellations table
    cancel_res = client.table("order_cancellations").select("*").eq("order_id", id).order("created_at", desc=True).limit(1).execute()
    previous_status = "confirmed"
    if cancel_res.data:
        previous_status = cancel_res.data[0]["previous_status"]
        
    new_status = "cancelled" if decision.get("approved") else previous_status
    
    client.table("orders").update({"status": new_status}).eq("id", id).execute()
    
    hist_data = {
        "order_id": id,
        "from_status": "cancellation_requested",
        "to_status": new_status,
        "changed_by": current_user["id"],
        "note": decision.get("note", "Cancellation approved" if decision.get("approved") else "Cancellation rejected")
    }
    client.table("order_status_history").insert(hist_data).execute()
    
    create_notification(
        user_id=order["buyer_id"],
        type="cancellation" if decision.get("approved") else "cancellation_rejected",
        title="Cancellation Approved" if decision.get("approved") else "Cancellation Rejected",
        message=f"Your cancellation request for Order {order['display_id']} was {'approved' if decision.get('approved') else 'rejected'}.",
        metadata={"order_id": id, "note": decision.get("note", "")}
    )
    
    return {"status": "success", "new_status": new_status}
