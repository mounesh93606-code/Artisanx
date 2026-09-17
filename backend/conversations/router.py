from fastapi import APIRouter, Depends, HTTPException
from auth.dependencies import get_current_user, get_token
from database import get_authenticated_client, get_service_client
from .schemas import MessageCreate
from notifications.service import create_notification

router = APIRouter(prefix="/conversations", tags=["conversations"])

@router.get("/")
def get_conversations(current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    client = get_service_client()
    user_id = current_user["id"]
    role = current_user.get("role")
    
    # We query conversations where user is artisan or buyer
    if role == "artisan":
        res = client.table("conversations").select("*, buyer:users!buyer_id(display_name), enquiry:buyer_enquiries(products(title))").eq("artisan_id", user_id).order("updated_at", desc=True).execute()
    else:
        res = client.table("conversations").select("*, artisan:users!artisan_id(display_name), enquiry:buyer_enquiries(products(title))").eq("buyer_id", user_id).order("updated_at", desc=True).execute()
        
    conversations = res.data or []
    
    # Fetch unread count for each
    conv_ids = [c["id"] for c in conversations]
    if conv_ids:
        msg_res = client.table("messages").select("conversation_id, is_read").in_("conversation_id", conv_ids).neq("sender_id", user_id).eq("is_read", False).execute()
        unread_map = {}
        for m in (msg_res.data or []):
            unread_map[m["conversation_id"]] = unread_map.get(m["conversation_id"], 0) + 1
            
        for c in conversations:
            c["unread_count"] = unread_map.get(c["id"], 0)
            
    return {"conversations": conversations}

@router.get("/by-enquiry/{enquiry_id}")
def get_conversation_by_enquiry(enquiry_id: str, current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    client = get_service_client()
    user_id = current_user["id"]
    
    res = client.table("conversations").select("*").eq("enquiry_id", enquiry_id).execute()
    if not res.data:
        # Check if user has permission to create it (must own the enquiry)
        enq_res = client.table("buyer_enquiries").select("*").eq("id", enquiry_id).execute()
        if not enq_res.data:
            raise HTTPException(status_code=404, detail="Enquiry not found")
            
        enq = enq_res.data[0]
        if enq["artisan_id"] != user_id and enq["buyer_id"] != user_id:
            raise HTTPException(status_code=403, detail="Forbidden")
            
        # Create it
        conv_data = {
            "enquiry_id": enquiry_id,
            "artisan_id": enq["artisan_id"],
            "buyer_id": enq["buyer_id"]
        }
        c_res = client.table("conversations").insert(conv_data).execute()
        return {"conversation": c_res.data[0]}
        
    conv = res.data[0]
    if conv["artisan_id"] != user_id and conv["buyer_id"] != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    return {"conversation": conv}

@router.get("/by-order/{order_id}")
def get_conversation_by_order(order_id: str, current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    client = get_service_client()
    user_id = current_user["id"]
    
    res = client.table("conversations").select("*").eq("order_id", order_id).execute()
    if not res.data:
        ord_res = client.table("orders").select("*").eq("id", order_id).execute()
        if not ord_res.data:
            raise HTTPException(status_code=404, detail="Order not found")
            
        ord_obj = ord_res.data[0]
        if ord_obj["artisan_id"] != user_id and ord_obj["buyer_id"] != user_id:
            raise HTTPException(status_code=403, detail="Forbidden")
            
        conv_data = {
            "order_id": order_id,
            "enquiry_id": ord_obj.get("enquiry_id"),
            "artisan_id": ord_obj["artisan_id"],
            "buyer_id": ord_obj["buyer_id"]
        }
        c_res = client.table("conversations").insert(conv_data).execute()
        return {"conversation": c_res.data[0]}
        
    conv = res.data[0]
    if conv["artisan_id"] != user_id and conv["buyer_id"] != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    return {"conversation": conv}

@router.get("/{id}/messages")
def get_messages(id: str, current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    client = get_service_client()
    user_id = current_user["id"]
    
    # Verify access implicitly via RLS but let's be explicit
    c_res = client.table("conversations").select("*").eq("id", id).execute()
    
    role = current_user.get("role")
    if not c_res.data:
        raise HTTPException(status_code=403, detail="Forbidden")
    conv = c_res.data[0]
    
    is_participant = (conv.get("artisan_id") == user_id or conv.get("buyer_id") == user_id)
    is_authorized_fac = role == "facilitator" and (conv.get("support_request_id") or conv.get("dispute_id"))
    
    if not is_participant and not is_authorized_fac:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    res = client.table("messages").select("*, sender:users!sender_id(display_name)").eq("conversation_id", id).order("created_at", desc=False).execute()
    messages = []
    for m in (res.data or []):
        m["message"] = m.get("content") or ""
        messages.append(m)
    return {"messages": messages}

@router.post("/{id}/messages")
def send_message(id: str, req: MessageCreate, current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    client = get_service_client()
    user_id = current_user["id"]
    
    role = current_user.get("role")
    c_res = client.table("conversations").select("*, enquiry:buyer_enquiries(products(title))").eq("id", id).execute()
    
    if not c_res.data:
        raise HTTPException(status_code=403, detail="Forbidden")
    conv = c_res.data[0]
    
    is_participant = (conv.get("artisan_id") == user_id or conv.get("buyer_id") == user_id)
    is_authorized_fac = role == "facilitator" and (conv.get("support_request_id") or conv.get("dispute_id"))
    
    if not is_participant and not is_authorized_fac:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    recipient_ids = []
    if role == "buyer":
        recipient_ids.append(conv["artisan_id"])
    elif role == "artisan":
        if conv["buyer_id"]:
            recipient_ids.append(conv["buyer_id"])
        # If it's a support request or dispute, facilitators monitor it, 
        # but we don't have a specific facilitator ID to notify.
    elif role == "facilitator":
        recipient_ids.append(conv["artisan_id"])
        if conv["buyer_id"]:
            recipient_ids.append(conv["buyer_id"])
    
    text = (req.content or req.message or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message content cannot be empty")

    msg_data = {
        "conversation_id": id,
        "sender_id": user_id,
        "content": text
    }
    m_res = client.table("messages").insert(msg_data).execute()
    
    # Update conversation timestamp
    client.table("conversations").update({"updated_at": "now()"}).eq("id", id).execute()
    
    # Send notification
    product_title = conv.get("enquiry", {}).get("products", {}).get("title", "a product") if conv.get("enquiry") else "a support/dispute request"
    preview = text[:50] + "..." if len(text) > 50 else text
    
    notif_type = "buyer_message" if role == "buyer" else "artisan_message" if role == "artisan" else "facilitator_message"
    
    for rec_id in recipient_ids:
        create_notification(
            user_id=rec_id,
            type=notif_type,
            title="New Message Received",
            message=f"You received a message regarding {product_title}.",
            metadata={"conversation_id": id, "enquiry_id": conv.get("enquiry_id"), "preview": preview}
        )
    
    out_msg = m_res.data[0]
    out_msg["message"] = out_msg.get("content") or ""
    return {"status": "success", "message": out_msg}

@router.put("/{id}/read")
def mark_read(id: str, current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    client = get_service_client()
    user_id = current_user["id"]
    
    # Update all messages in this conversation not sent by me to read
    client.table("messages").update({"is_read": True}).eq("conversation_id", id).neq("sender_id", user_id).eq("is_read", False).execute()
    return {"status": "success"}
