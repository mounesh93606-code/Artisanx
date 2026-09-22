import logging
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from typing import Optional, Dict, Any

from auth.dependencies import get_current_user, get_token
from database import get_service_client, get_authenticated_client
from config import settings
from .schemas import (
    CreateCashfreeOrderRequest,
    CashfreeOrderResponse,
    PaymentStatusResponse,
    InvoiceResponse
)
from .service import (
    calculate_and_validate_items,
    create_cashfree_order_session,
    verify_webhook_signature,
    settle_successful_payment,
    fetch_cashfree_order_status,
    generate_display_id,
    find_orders_by_identifier
)

logger = logging.getLogger("artisanx.payments.router")

router = APIRouter(prefix="/payments", tags=["payments"])

@router.post("/cashfree/create-order", response_model=CashfreeOrderResponse)
async def create_cashfree_order(
    req: CreateCashfreeOrderRequest,
    current_user: dict = Depends(get_current_user),
    token: str = Depends(get_token)
):
    """
    Creates a pending order in ArtisanX and initializes a Cashfree payment session.
    Strictly verifies buyer role, inventory, and artisan enquiry confirmation.
    Prices are calculated server-side from database records.
    """
    buyer_id = current_user.get("id")
    if current_user.get("role") != "buyer":
        raise HTTPException(status_code=403, detail="Unauthorized: Only buyers can initiate payment orders")

    if not req.items or len(req.items) == 0:
        raise HTTPException(status_code=400, detail="Order must contain at least one item")

    service_client = get_service_client()

    # 1. Validate items, enforce enquiry confirmation, calculate server-side amount
    validated_items, grand_total = calculate_and_validate_items(service_client, buyer_id, req.items)

    # 2. Generate unique internal gateway order ID
    date_prefix = datetime.utcnow().strftime("%Y%m%d")
    unique_suffix = generate_display_id(prefix="").lstrip('-')
    gateway_order_id = f"AX_{date_prefix}_{unique_suffix}"

    created_orders = []
    order_ids = []
    display_ids = []

    # 3. Create initial pending order records in database
    for v_item in validated_items:
        prod = v_item["product"]
        display_id = generate_display_id()
        item_input = v_item["item_input"]

        product_snapshot = {
            "product_id": prod["id"],
            "title": prod.get("title", "Product"),
            "description": prod.get("description", ""),
            "category": prod.get("category", ""),
            "price": v_item["unit_price"],
            "image_url": v_item["image_url"],
            "artisan_id": prod["artisan_id"],
            "artisan_name": prod.get("artisan_name", "Artisan"),
            "materials": prod.get("materials"),
            "dimensions": prod.get("dimensions"),
            "variant": item_input.variant,
            "delivery_address": req.delivery_address,
            "buyer_notes": req.notes,
            "payment": {
                "status": "payment_initiated",
                "payment_gateway": "cashfree",
                "gateway_order_id": gateway_order_id,
                "amount": v_item["total_price"]
            }
        }

        order_record = {
            "display_id": display_id,
            "enquiry_id": v_item["enquiry_id"],
            "product_id": prod["id"],
            "buyer_id": buyer_id,
            "artisan_id": prod["artisan_id"],
            "status": "confirmed",
            "quantity": v_item["quantity"],
            "unit_price": v_item["unit_price"],
            "total_order_value": v_item["total_price"],
            "customization_details": item_input.customization or req.notes,
            "product_snapshot": product_snapshot
        }

        # Inject payment_status and gateway_order_id if present
        order_record["payment_status"] = "payment_initiated"
        order_record["payment_gateway"] = "cashfree"
        order_record["gateway_order_id"] = gateway_order_id

        try:
            ord_res = service_client.table("orders").insert(order_record).execute()
        except Exception as e:
            logger.warning(f"Retrying insert without extended columns: {e}")
            # Fallback to schema base fields
            base_record = {k: v for k, v in order_record.items() if k not in ["payment_status", "payment_gateway", "gateway_order_id"]}
            ord_res = service_client.table("orders").insert(base_record).execute()

        if not ord_res.data:
            raise HTTPException(status_code=500, detail="Failed to initialize order record")

        created_ord = ord_res.data[0]
        created_orders.append(created_ord)
        order_ids.append(created_ord["id"])
        display_ids.append(display_id)

    # 4. Create Cashfree Order session
    note = f"ArtisanX Order {display_ids[0]}" if len(display_ids) == 1 else f"ArtisanX Batch Order ({len(display_ids)} items)"
    cf_session = await create_cashfree_order_session(
        order_id=gateway_order_id,
        amount=grand_total,
        currency="INR",
        customer=current_user,
        order_note=note,
        client_return_url=req.return_url
    )

    cf_order_id = str(cf_session.get("cf_order_id") or "")
    if cf_order_id:
        for ord_item in created_orders:
            try:
                ps = dict(ord_item.get("product_snapshot") or {})
                if "payment" in ps:
                    ps["payment"]["cf_order_id"] = cf_order_id
                service_client.table("orders").update({
                    "product_snapshot": ps,
                    "cf_order_id": cf_order_id
                }).eq("id", ord_item["id"]).execute()
            except Exception:
                try:
                    service_client.table("orders").update({
                        "product_snapshot": ps
                    }).eq("id", ord_item["id"]).execute()
                except Exception:
                    pass

    # 5. Record in payments table if exists
    try:
        service_client.table("payments").insert({
            "order_id": order_ids[0] if order_ids else None,
            "display_order_id": display_ids[0] if display_ids else gateway_order_id,
            "buyer_id": buyer_id,
            "gateway": "cashfree",
            "gateway_order_id": gateway_order_id,
            "payment_session_id": cf_session.get("payment_session_id"),
            "amount": grand_total,
            "currency": "INR",
            "status": "payment_initiated",
            "payment_method": "upi"
        }).execute()
    except Exception as e:
        logger.warning(f"Payments table insert notice: {e}")

    env_name = (settings.CASHFREE_ENV or "SANDBOX").upper()
    return CashfreeOrderResponse(
        payment_session_id=cf_session["payment_session_id"],
        cf_order_id=cf_session.get("cf_order_id"),
        order_id=gateway_order_id,
        display_id=display_ids[0],
        order_ids=order_ids,
        display_ids=display_ids,
        amount=grand_total,
        currency="INR",
        environment=env_name,
        checkout_url=cf_session.get("checkout_url")
    )

@router.api_route("/cashfree/webhook", methods=["GET", "POST", "HEAD"])
async def cashfree_webhook(
    request: Request,
    x_webhook_signature: Optional[str] = Header(None, alias="x-webhook-signature"),
    x_webhook_timestamp: Optional[str] = Header(None, alias="x-webhook-timestamp")
):
    """
    Cashfree Webhook Handler.
    Receives raw body, verifies HMAC-SHA256 signature, and performs idempotent order settlement.
    Supports GET/HEAD health checks and test pings from Cashfree dashboard.
    """
    if request.method in ["GET", "HEAD"]:
        return {"status": "ok", "message": "Cashfree webhook endpoint is active"}

    raw_body = await request.body()
    if not raw_body or raw_body.strip() == b"":
        return {"status": "ok", "message": "Webhook listener active"}

    logger.info(f"Received Cashfree webhook with timestamp={x_webhook_timestamp}")

    # 1. Verify Webhook Signature
    is_valid = verify_webhook_signature(
        raw_body=raw_body,
        timestamp=x_webhook_timestamp or "",
        signature=x_webhook_signature or ""
    )

    if not is_valid:
        logger.warning("Rejected webhook due to invalid signature.")
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    # 2. Parse payload safely only after signature verification
    try:
        payload = json.loads(raw_body.decode('utf-8'))
    except Exception as e:
        logger.error(f"Failed to decode webhook JSON: {e}")
        raise HTTPException(status_code=400, detail="Malformed JSON payload")

    event_type = payload.get("type", "")
    data = payload.get("data", {})
    order_data = data.get("order", {})
    payment_data = data.get("payment", {})

    gateway_order_id = order_data.get("order_id")
    cf_order_id = str(order_data.get("cf_order_id") or "")
    if not gateway_order_id and not cf_order_id:
        logger.warning("Webhook payload missing order_id and cf_order_id.")
        return {"status": "ignored", "reason": "no_order_id"}

    lookup_id = gateway_order_id or cf_order_id
    service_client = get_service_client()

    # 3. Handle Payment Success Event
    if event_type == "PAYMENT_SUCCESS_WEBHOOK" or payment_data.get("payment_status") == "SUCCESS":
        gateway_payment_id = str(payment_data.get("cf_payment_id") or payment_data.get("bank_reference") or f"pay_{lookup_id}")
        amount_paid = float(payment_data.get("payment_amount") or order_data.get("order_amount") or 0.0)

        logger.info(f"Processing verified PAYMENT_SUCCESS_WEBHOOK for order {lookup_id}, payment_id={gateway_payment_id}")
        result = settle_successful_payment(
            service_client=service_client,
            gateway_order_id=lookup_id,
            gateway_payment_id=gateway_payment_id,
            amount_paid=amount_paid,
            raw_event=payload,
            cf_order_id=cf_order_id
        )
        return {"status": "ok", "result": result.get("status")}

    # 4. Handle Payment Failure Event
    elif event_type in ["PAYMENT_FAILED_WEBHOOK", "PAYMENT_USER_DROPPED_WEBHOOK"]:
        logger.info(f"Processing payment failure webhook for order {lookup_id}")
        try:
            service_client.table("orders").update({
                "payment_status": "payment_failed"
            }).eq("gateway_order_id", lookup_id).execute()
        except Exception:
            pass
        return {"status": "ok", "result": "failed_recorded"}

    return {"status": "ok", "result": "event_unhandled"}

@router.get("/cashfree/status/{order_id}", response_model=PaymentStatusResponse)
async def get_payment_status(
    order_id: str,
    current_user: dict = Depends(get_current_user),
    token: str = Depends(get_token)
):
    """
    Retrieves the verified payment status of an order.
    Queries Cashfree directly if the order is still marked as pending in the local database.
    """
    service_client = get_service_client()
    user_id = current_user.get("id")

    # Look up order safely by id, display_id, gateway_order_id, or snapshot
    orders = find_orders_by_identifier(service_client, order_id)

    if not orders:
        raise HTTPException(status_code=404, detail="Order not found")

    order = orders[0]

    # Verify authorization
    if order["buyer_id"] != user_id and order["artisan_id"] != user_id and current_user.get("role") != "facilitator":
        raise HTTPException(status_code=403, detail="Forbidden")

    # Check stored status
    stored_status = order.get("payment_status") or order.get("product_snapshot", {}).get("payment", {}).get("status") or "payment_initiated"

    # If already paid, return immediately
    if stored_status == "paid":
        snapshot = order.get("product_snapshot", {})
        payment_meta = snapshot.get("payment", {})
        invoice_meta = snapshot.get("invoice", {})

        return PaymentStatusResponse(
            order_id=order["id"],
            display_id=order.get("display_id", order_id),
            payment_status="paid",
            order_status=order.get("status", "confirmed"),
            amount=float(order.get("total_order_value", 0)),
            currency="INR",
            payment_method="upi",
            invoice_id=invoice_meta.get("invoice_number") or order.get("invoice_id"),
            gateway_payment_id=payment_meta.get("gateway_payment_id") or order.get("gateway_payment_id"),
            paid_at=order.get("paid_at") or payment_meta.get("paid_at")
        )

    # If pending locally, query Cashfree API for real-time status
    gateway_id = order.get("gateway_order_id") or order_id
    try:
        cf_status = await fetch_cashfree_order_status(gateway_id)
        payments = cf_status.get("payments", [])
        successful_payment = next((p for p in payments if p.get("payment_status") == "SUCCESS"), None)

        if successful_payment or cf_status.get("order_status") == "PAID":
            # Cashfree confirmed payment -> execute idempotent settlement
            pay_id = (successful_payment.get("cf_payment_id") if successful_payment else f"pay_{gateway_id}")
            amount = (successful_payment.get("payment_amount") if successful_payment else float(order.get("total_order_value", 0)))

            logger.info(f"Verified payment from Cashfree status check for {gateway_id}. Settling order.")
            settle_successful_payment(
                service_client=service_client,
                gateway_order_id=gateway_id,
                gateway_payment_id=str(pay_id),
                amount_paid=float(amount)
            )

            # Re-fetch updated order
            upd_res = service_client.table("orders").select("*").eq("id", order["id"]).execute()
            if upd_res.data:
                order = upd_res.data[0]
            stored_status = "paid"
    except Exception as e:
        logger.warning(f"Notice: Cashfree status query could not complete: {e}")

    snapshot = order.get("product_snapshot", {})
    payment_meta = snapshot.get("payment", {})
    invoice_meta = snapshot.get("invoice", {})

    return PaymentStatusResponse(
        order_id=order["id"],
        display_id=order.get("display_id", order_id),
        payment_status=stored_status,
        order_status=order.get("status", "confirmed"),
        amount=float(order.get("total_order_value", 0)),
        currency="INR",
        payment_method="upi",
        invoice_id=invoice_meta.get("invoice_number") or order.get("invoice_id"),
        gateway_payment_id=payment_meta.get("gateway_payment_id") or order.get("gateway_payment_id"),
        paid_at=order.get("paid_at") or payment_meta.get("paid_at")
    )

@router.get("/invoice/{order_id}", response_model=InvoiceResponse)
async def get_invoice(
    order_id: str,
    current_user: dict = Depends(get_current_user),
    token: str = Depends(get_token)
):
    """
    Retrieves the generated invoice for a confirmed, paid order.
    """
    service_client = get_service_client()
    user_id = current_user.get("id")

    # 1. Fetch order safely
    orders = find_orders_by_identifier(
        service_client, 
        order_id, 
        select_query="*, buyer:users!buyer_id(display_name, email, phone), artisan:users!artisan_id(display_name)"
    )
    if not orders:
        orders = find_orders_by_identifier(service_client, order_id)

    if not orders:
        raise HTTPException(status_code=404, detail="Order not found")

    order = orders[0]

    # 2. Verify authorization
    if order["buyer_id"] != user_id and order["artisan_id"] != user_id and current_user.get("role") != "facilitator":
        raise HTTPException(status_code=403, detail="Forbidden")

    # 3. Check if order is paid
    payment_status = order.get("payment_status") or order.get("product_snapshot", {}).get("payment", {}).get("status")
    if payment_status != "paid":
        raise HTTPException(status_code=400, detail="Invoice is not yet available for an unpaid order")

    snapshot = order.get("product_snapshot", {})
    invoice_meta = snapshot.get("invoice", {}).get("invoice_data")

    # If invoice_data exists in snapshot, return it
    if invoice_meta:
        return InvoiceResponse(
            invoice_number=invoice_meta.get("invoice_number", f"INV-{order.get('display_id')}"),
            order_id=order["id"],
            display_id=order.get("display_id", order_id),
            buyer_id=order["buyer_id"],
            buyer_name=invoice_meta.get("buyer", {}).get("name") or order.get("buyer", {}).get("display_name") or "Buyer",
            buyer_phone=invoice_meta.get("buyer", {}).get("phone") or order.get("buyer", {}).get("phone"),
            buyer_email=order.get("buyer", {}).get("email"),
            artisan_id=order["artisan_id"],
            artisan_name=invoice_meta.get("artisan", {}).get("name") or order.get("artisan", {}).get("display_name") or "Artisan",
            product_title=snapshot.get("title", "Product"),
            quantity=order.get("quantity", 1),
            unit_price=float(order.get("unit_price", order.get("total_order_value", 0))),
            subtotal=float(order.get("total_order_value", 0)),
            tax=0.0,
            total=float(order.get("total_order_value", 0)),
            currency="INR",
            payment_method="UPI",
            payment_status="PAID",
            gateway_payment_id=snapshot.get("payment", {}).get("gateway_payment_id") or order.get("gateway_payment_id"),
            created_at=order.get("created_at") or datetime.utcnow().isoformat(),
            delivery_address=snapshot.get("delivery_address")
        )

    # Fallback to reconstructing invoice
    inv_num = order.get("invoice_id") or f"INV-{order.get('display_id')}"
    return InvoiceResponse(
        invoice_number=inv_num,
        order_id=order["id"],
        display_id=order.get("display_id", order_id),
        buyer_id=order["buyer_id"],
        buyer_name=order.get("buyer", {}).get("display_name") or "Buyer",
        buyer_phone=order.get("buyer", {}).get("phone"),
        buyer_email=order.get("buyer", {}).get("email"),
        artisan_id=order["artisan_id"],
        artisan_name=order.get("artisan", {}).get("display_name") or "Artisan",
        product_title=snapshot.get("title", "Product"),
        quantity=order.get("quantity", 1),
        unit_price=float(order.get("unit_price", order.get("total_order_value", 0))),
        subtotal=float(order.get("total_order_value", 0)),
        tax=0.0,
        total=float(order.get("total_order_value", 0)),
        currency="INR",
        payment_method="UPI",
        payment_status="PAID",
        gateway_payment_id=order.get("gateway_payment_id"),
        created_at=order.get("created_at") or datetime.utcnow().isoformat(),
        delivery_address=snapshot.get("delivery_address")
    )
