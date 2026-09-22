import os
import hmac
import hashlib
import base64
import json
import logging
import random
import string
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
import httpx
from fastapi import HTTPException

from config import settings
from database import get_service_client
from notifications.service import create_notification

logger = logging.getLogger("artisanx.payments")

def get_cashfree_base_url() -> str:
    env = (settings.CASHFREE_ENV or "SANDBOX").strip().upper()
    if env == "PRODUCTION":
        return "https://api.cashfree.com/pg"
    return "https://sandbox.cashfree.com/pg"

def get_cashfree_headers() -> Dict[str, str]:
    return {
        "x-client-id": settings.CASHFREE_APP_ID.strip(),
        "x-client-secret": settings.CASHFREE_SECRET_KEY.strip(),
        "x-api-version": settings.CASHFREE_API_VERSION or "2023-08-01",
        "Content-Type": "application/json"
    }

def generate_display_id(prefix: str = "AX-ORD") -> str:
    rand_str = ''.join(random.choices(string.digits, k=5))
    return f"{prefix}-{rand_str}"

def generate_invoice_number() -> str:
    date_str = datetime.utcnow().strftime("%Y%m%d")
    rand_suffix = ''.join(random.choices(string.digits, k=4))
    return f"INV-{date_str}-{rand_suffix}"

def verify_enquiry_confirmation(service_client, buyer_id: str, product_id: str, enquiry_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Strictly verifies that an artisan has confirmed the enquiry for this buyer & product.
    If enquiry is pending, rejected, or missing, an HTTPException is raised.
    """
    if enquiry_id:
        enq_res = service_client.table("buyer_enquiries").select("*").eq("id", enquiry_id).execute()
        if not enq_res.data:
            raise HTTPException(status_code=404, detail="Referenced enquiry not found")
        enquiry = enq_res.data[0]
        if enquiry.get("buyer_id") != buyer_id or enquiry.get("product_id") != product_id:
            raise HTTPException(status_code=403, detail="Invalid enquiry reference for this product and buyer")
        
        # Check rejection
        if enquiry.get("status") == "rejected" or enquiry.get("artisan_response") in ["cannot_fulfil", "rejected"]:
            raise HTTPException(status_code=400, detail="Artisan did not confirm this enquiry request.")
        
        # Check pending vs confirmed
        is_confirmed = (
            (enquiry.get("status") in ["accepted", "responded"] and enquiry.get("artisan_response") in ["accepted", "interested"]) 
            or enquiry.get("status") in ["quote_sent", "accepted"]
        )
        if not is_confirmed:
            raise HTTPException(status_code=403, detail="Payment unavailable: Enquiry is waiting for artisan confirmation.")
        return enquiry
    else:
        # Check if buyer has any confirmed enquiry for this product
        check_enq = service_client.table("buyer_enquiries").select("*").eq("buyer_id", buyer_id).eq("product_id", product_id).execute()
        confirmed = [
            e for e in (check_enq.data or []) 
            if ((e.get("status") in ["accepted", "responded"] and e.get("artisan_response") in ["accepted", "interested"]) 
                or e.get("status") in ["quote_sent", "accepted"])
        ]
        if not confirmed:
            raise HTTPException(
                status_code=403, 
                detail="Payment cannot proceed: This product requires an artisan-confirmed enquiry before checkout."
            )
        return confirmed[0]

def calculate_and_validate_items(service_client, buyer_id: str, items: List[Any]) -> Tuple[List[Dict[str, Any]], float]:
    """
    Validates items, checks stock, enforces enquiry confirmation,
    and calculates true unit price and totals server-side from database.
    """
    validated_items = []
    total_amount = 0.0

    for item in items:
        prod_id = item.product_id
        qty = item.quantity
        if qty <= 0:
            raise HTTPException(status_code=400, detail="Item quantity must be greater than 0")

        # 1. Enforce enquiry confirmation rule
        enquiry = verify_enquiry_confirmation(service_client, buyer_id, prod_id, item.enquiry_id)
        enquiry_id = enquiry["id"]

        # 2. Fetch official product details from DB
        prod_res = service_client.table("products").select("*").eq("id", prod_id).execute()
        if not prod_res.data:
            raise HTTPException(status_code=404, detail=f"Product {prod_id} not found")
        product = prod_res.data[0]

        if product.get("status") and product.get("status") not in ["published", "active"]:
            raise HTTPException(status_code=400, detail=f"Product '{product.get('title')}' is currently unavailable")

        # 3. Check MOQ
        moq = product.get("moq") or 1
        if qty < moq:
            raise HTTPException(status_code=400, detail=f"Minimum order quantity for '{product.get('title')}' is {moq}")

        # 4. Check Stock
        if product.get("stock_quantity") is not None and not product.get("is_made_to_order"):
            if qty > product["stock_quantity"]:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Requested quantity ({qty}) exceeds available stock ({product['stock_quantity']}) for '{product.get('title')}'"
                )

        # 5. Calculate Price Server-Side (NEVER trust frontend price)
        unit_price = float(product.get("price") or 0)
        if item.variant and item.variant.get("price_adjustment"):
            try:
                unit_price += float(item.variant.get("price_adjustment", 0))
            except (ValueError, TypeError):
                pass

        item_total = round(unit_price * qty, 2)
        total_amount += item_total

        # Fetch product image
        img_res = service_client.table("product_images").select("image_url").eq("product_id", prod_id).order("sort_order").execute()
        img_url = img_res.data[0]["image_url"] if (img_res.data and len(img_res.data) > 0) else ""

        validated_items.append({
            "item_input": item,
            "product": product,
            "enquiry_id": enquiry_id,
            "unit_price": unit_price,
            "total_price": item_total,
            "image_url": img_url,
            "quantity": qty
        })

    return validated_items, round(total_amount, 2)

async def create_cashfree_order_session(
    order_id: str,
    amount: float,
    currency: str,
    customer: Dict[str, Any],
    order_note: str,
    client_return_url: Optional[str] = None
) -> Dict[str, Any]:
    """
    Calls Cashfree API /pg/orders to create a payment order session.
    """
    app_id = (settings.CASHFREE_APP_ID or "").strip()
    secret_key = (settings.CASHFREE_SECRET_KEY or "").strip()
    frontend_base = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")

    # Determine Return URL
    if client_return_url and "{order_id}" in client_return_url:
        return_url = client_return_url.replace("{order_id}", order_id)
    elif client_return_url:
        sep = "&" if "?" in client_return_url else "?"
        return_url = f"{client_return_url}{sep}order_id={order_id}"
    else:
        return_template = settings.CASHFREE_RETURN_URL or f"{frontend_base}/buyer/payment/status?order_id={{order_id}}"
        return_url = return_template.replace("{order_id}", order_id)

    notify_url = settings.CASHFREE_NOTIFY_URL or f"{settings.BACKEND_URL.rstrip('/')}/payments/cashfree/webhook"

    # Sanitize customer phone (Cashfree requires 10-digit number)
    raw_phone = str(customer.get("phone") or "9999999999").replace(" ", "").replace("-", "").replace("+91", "")
    if len(raw_phone) != 10 or not raw_phone.isdigit():
        raw_phone = "9999999999"

    raw_email = customer.get("email") or f"{customer.get('id', 'buyer')}@artisanx.com"
    customer_id = customer.get("id") or "buyer_default"
    # Ensure customer_id is alphanumeric with _ or -
    clean_customer_id = "".join(c for c in customer_id if c.isalnum() or c in ['_', '-'])[:45]

    payload = {
        "order_id": order_id,
        "order_amount": round(amount, 2),
        "order_currency": currency or "INR",
        "customer_details": {
            "customer_id": clean_customer_id or "artisanx_buyer",
            "customer_name": customer.get("display_name") or "ArtisanX Buyer",
            "customer_email": raw_email,
            "customer_phone": raw_phone
        },
        "order_meta": {
            "return_url": return_url,
            "notify_url": notify_url,
            "payment_methods": "upi"
        },
        "order_note": order_note[:100]
    }

    env = (settings.CASHFREE_ENV or "SANDBOX").strip().upper()
    base_checkout = "https://api.cashfree.com/checkout" if env == "PRODUCTION" else "https://sandbox.cashfree.com/checkout"

    # If keys are configured, make actual HTTP request to Cashfree
    if app_id and secret_key:
        base_url = get_cashfree_base_url()
        endpoint = f"{base_url}/orders"
        headers = get_cashfree_headers()

        logger.info(f"Creating Cashfree payment order {order_id} at {endpoint} for ₹{amount}")
        async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
            res = await client.post(endpoint, json=payload, headers=headers)
            if res.status_code not in [200, 201]:
                logger.error(f"Cashfree order creation failed [{res.status_code}]: {res.text}")
                raise HTTPException(
                    status_code=502, 
                    detail=f"Cashfree Gateway Error: {res.json().get('message', res.text) if res.headers.get('content-type', '').startswith('application/json') else res.text}"
                )
            data = res.json()
            ps_id = data.get("payment_session_id")
            return {
                "payment_session_id": ps_id,
                "cf_order_id": str(data.get("cf_order_id", "")),
                "order_id": data.get("order_id", order_id),
                "order_status": data.get("order_status", "ACTIVE"),
                "checkout_url": f"{base_checkout}/?pt={ps_id}" if ps_id else None
            }
    else:
        # Sandbox Test Mode Fallback (when credentials are not yet provisioned in .env)
        logger.warning(f"Cashfree credentials not set in .env. Emulating Sandbox payment session for order {order_id}.")
        simulated_session_id = f"sandbox_session_{order_id}_{int(datetime.utcnow().timestamp())}"
        return {
            "payment_session_id": simulated_session_id,
            "cf_order_id": f"cf_{order_id}",
            "order_id": order_id,
            "order_status": "ACTIVE",
            "checkout_url": f"{base_checkout}/?pt={simulated_session_id}"
        }

def verify_webhook_signature(raw_body: bytes, timestamp: str, signature: str) -> bool:
    """
    Verifies Cashfree webhook HMAC-SHA256 signature against CASHFREE_SECRET_KEY.
    Formula per Cashfree documentation:
    signed_payload = timestamp + "." + raw_body
    expected_sig = Base64(HMAC-SHA256(signed_payload, secret_key))
    """
    secret_key = (settings.CASHFREE_SECRET_KEY or "").strip()
    if not secret_key:
        logger.warning("CASHFREE_SECRET_KEY is empty. Skipping signature verification in test environment.")
        return True

    if not timestamp or not signature:
        if getattr(settings, "CASHFREE_ENV", "SANDBOX").upper() == "SANDBOX":
            logger.warning("Missing webhook timestamp or signature header in SANDBOX mode. Allowing for dashboard test.")
            return True
        logger.warning("Missing webhook timestamp or signature header.")
        return False

    try:
        body_str = raw_body.decode('utf-8')
        
        # Primary formula: timestamp + "." + raw_body
        payload_with_dot = f"{timestamp}.{body_str}".encode('utf-8')
        computed_dot = base64.b64encode(
            hmac.new(secret_key.encode('utf-8'), payload_with_dot, hashlib.sha256).digest()
        ).decode('utf-8')

        if hmac.compare_digest(computed_dot, signature):
            return True

        # Fallback formula: timestamp + raw_body (used in some SDK versions)
        payload_no_dot = f"{timestamp}{body_str}".encode('utf-8')
        computed_no_dot = base64.b64encode(
            hmac.new(secret_key.encode('utf-8'), payload_no_dot, hashlib.sha256).digest()
        ).decode('utf-8')

        return hmac.compare_digest(computed_no_dot, signature)
    except Exception as e:
        logger.error(f"Error while verifying webhook signature: {e}")
        return False

def find_orders_by_identifier(service_client, identifier: str, select_query: str = "*") -> List[Dict[str, Any]]:
    """
    Safely finds orders by ID, display_id, gateway_order_id column, or product_snapshot.
    Gracefully handles schemas where extended payment columns have not yet migrated.
    """
    if not identifier:
        return []

    # 1. Try querying by id or display_id
    try:
        res = service_client.table("orders").select(select_query).or_(f"id.eq.{identifier},display_id.eq.{identifier}").execute()
        if res.data and len(res.data) > 0:
            return res.data
    except Exception:
        pass

    # 2. Try by id directly (handles UUID)
    try:
        res = service_client.table("orders").select(select_query).eq("id", identifier).execute()
        if res.data and len(res.data) > 0:
            return res.data
    except Exception:
        pass

    # 3. Try by display_id directly
    try:
        res = service_client.table("orders").select(select_query).eq("display_id", identifier).execute()
        if res.data and len(res.data) > 0:
            return res.data
    except Exception:
        pass

    # 4. Try querying by gateway_order_id column if present
    try:
        res = service_client.table("orders").select(select_query).eq("gateway_order_id", identifier).execute()
        if res.data and len(res.data) > 0:
            return res.data
    except Exception:
        pass

    # 5. Check product_snapshot->payment->>gateway_order_id
    try:
        res = service_client.table("orders").select(select_query).filter("product_snapshot->payment->>gateway_order_id", "eq", identifier).execute()
        if res.data and len(res.data) > 0:
            return res.data
    except Exception:
        pass

    # 5b. Check product_snapshot->payment->>cf_order_id
    try:
        res = service_client.table("orders").select(select_query).filter("product_snapshot->payment->>cf_order_id", "eq", identifier).execute()
        if res.data and len(res.data) > 0:
            return res.data
    except Exception:
        pass

    # 5c. Check cf_order_id column directly if present
    try:
        res = service_client.table("orders").select(select_query).eq("cf_order_id", identifier).execute()
        if res.data and len(res.data) > 0:
            return res.data
    except Exception:
        pass

    # 6. Check alternate prefix (e.g. cf_AX_... vs AX_...)
    alt_id = identifier[3:] if identifier.startswith("cf_") else f"cf_{identifier}"
    try:
        res = service_client.table("orders").select(select_query).filter("product_snapshot->payment->>gateway_order_id", "eq", alt_id).execute()
        if res.data and len(res.data) > 0:
            return res.data
    except Exception:
        pass

    try:
        res = service_client.table("orders").select(select_query).or_(f"id.eq.{alt_id},display_id.eq.{alt_id}").execute()
        if res.data and len(res.data) > 0:
            return res.data
    except Exception:
        pass

    return []

def settle_successful_payment(
    service_client,
    gateway_order_id: str,
    gateway_payment_id: str,
    amount_paid: float,
    raw_event: Optional[Dict[str, Any]] = None,
    cf_order_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Idempotently marks order(s) as PAID, updates payment status,
    deducts stock, sends notifications, and generates invoices.
    """
    now_iso = datetime.utcnow().isoformat()

    # 1. Find orders by gateway_order_id or product_snapshot reference
    orders = find_orders_by_identifier(service_client, gateway_order_id)
    if not orders and cf_order_id:
        orders = find_orders_by_identifier(service_client, cf_order_id)

    if not orders:
        logger.warning(f"No order found matching gateway_order_id {gateway_order_id} (cf_order_id={cf_order_id})")
        return {"status": "order_not_found"}

    # 2. Idempotency Check: if already PAID, return success without duplicate business actions
    already_paid = all(
        (o.get("payment_status") == "paid" or o.get("product_snapshot", {}).get("payment", {}).get("status") == "paid")
        for o in orders
    )
    if already_paid:
        logger.info(f"Order(s) for gateway_order_id {gateway_order_id} already marked as PAID. Returning idempotently.")
        return {
            "status": "already_processed",
            "orders": orders,
            "payment_status": "paid"
        }

    processed_orders = []

    for order in orders:
        order_id = order["id"]
        product = order.get("product_snapshot") or {}
        artisan_id = order["artisan_id"]
        buyer_id = order["buyer_id"]
        display_id = order.get("display_id", order_id)
        product_title = product.get("title", "Handcrafted Product")
        quantity = order.get("quantity", 1)
        order_value = float(order.get("total_order_value", amount_paid))

        # Update product_snapshot with payment metadata
        product_snapshot = dict(product)
        product_snapshot["payment"] = {
            "status": "paid",
            "payment_gateway": "cashfree",
            "payment_method": "upi",
            "gateway_order_id": gateway_order_id,
            "gateway_payment_id": gateway_payment_id,
            "amount_paid": amount_paid,
            "paid_at": now_iso
        }

        # Generate unique invoice number
        invoice_number = generate_invoice_number()

        # Build comprehensive invoice payload
        invoice_data = {
            "company": "ArtisanX",
            "invoice_number": invoice_number,
            "order_id": order_id,
            "display_id": display_id,
            "gateway_order_id": gateway_order_id,
            "gateway_payment_id": gateway_payment_id,
            "subtotal": order_value,
            "tax": 0.0,
            "total": order_value,
            "currency": "INR",
            "buyer": {
                "id": buyer_id,
                "name": product_snapshot.get("delivery_address", {}).get("full_name") or "Buyer",
                "phone": product_snapshot.get("delivery_address", {}).get("phone") or "",
                "address": product_snapshot.get("delivery_address", {})
            },
            "artisan": {
                "id": artisan_id,
                "name": product_snapshot.get("artisan_name") or "Artisan"
            },
            "product": {
                "id": order.get("product_id"),
                "title": product_title,
                "quantity": quantity,
                "unit_price": order.get("unit_price", order_value),
                "subtotal": order_value,
                "tax": 0.0,
                "total": order_value
            },
            "payment": {
                "method": "UPI",
                "status": "PAID",
                "gateway": "Cashfree",
                "gateway_payment_id": gateway_payment_id,
                "date": now_iso
            }
        }

        product_snapshot["invoice"] = {
            "invoice_number": invoice_number,
            "invoice_data": invoice_data
        }

        # Prepare update data for orders table
        update_data = {
            "status": "confirmed",
            "product_snapshot": product_snapshot
        }
        # Attempt to set new columns if present in schema
        try:
            update_data["payment_status"] = "paid"
            update_data["payment_gateway"] = "cashfree"
            update_data["gateway_order_id"] = gateway_order_id
            update_data["gateway_payment_id"] = gateway_payment_id
            update_data["amount_paid"] = amount_paid
            update_data["paid_at"] = now_iso
            update_data["payment_verified_at"] = now_iso
            update_data["invoice_id"] = invoice_number
        except Exception:
            pass

        # Update order in DB
        try:
            service_client.table("orders").update(update_data).eq("id", order_id).execute()
        except Exception as e:
            # Fallback if specific column hasn't migrated yet
            logger.warning(f"Retrying order update with base fields due to: {e}")
            service_client.table("orders").update({
                "status": "confirmed",
                "product_snapshot": product_snapshot
            }).eq("id", order_id).execute()

        # Insert into invoices table
        try:
            inv_row = {
                "invoice_number": invoice_number,
                "order_id": order_id,
                "buyer_id": buyer_id,
                "artisan_id": artisan_id,
                "amount": order_value,
                "currency": "INR",
                "payment_method": "upi",
                "payment_gateway": "cashfree",
                "gateway_payment_id": gateway_payment_id,
                "status": "paid",
                "invoice_data": invoice_data
            }
            service_client.table("invoices").insert(inv_row).execute()
        except Exception as e:
            logger.warning(f"Note: invoices table insert deferred or schema pending: {e}")

        # Insert into payments table
        try:
            service_client.table("payments").update({
                "status": "paid",
                "gateway_payment_id": gateway_payment_id,
                "updated_at": now_iso,
                "raw_response": raw_event
            }).eq("gateway_order_id", gateway_order_id).execute()
        except Exception as e:
            logger.warning(f"Note: payments table update notice: {e}")

        # Insert status history
        try:
            service_client.table("order_status_history").insert({
                "order_id": order_id,
                "from_status": "payment_pending",
                "to_status": "confirmed",
                "changed_by": buyer_id,
                "note": f"Payment verified via Cashfree UPI (Ref: {gateway_payment_id})"
            }).execute()
        except Exception as e:
            logger.warning(f"Order history insert notice: {e}")

        # Deduct stock if inventory is tracked
        try:
            prod_id = order.get("product_id")
            p_res = service_client.table("products").select("stock_quantity, is_made_to_order").eq("id", prod_id).execute()
            if p_res.data and p_res.data[0].get("stock_quantity") is not None and not p_res.data[0].get("is_made_to_order"):
                cur_stock = p_res.data[0]["stock_quantity"]
                new_stock = max(0, cur_stock - quantity)
                service_client.table("products").update({"stock_quantity": new_stock}).eq("id", prod_id).execute()
        except Exception as e:
            logger.error(f"Failed to deduct stock for product {order.get('product_id')}: {e}")

        # Send Notifications ONLY after verified payment
        try:
            # 1. Artisan Notification
            create_notification(
                user_id=artisan_id,
                type="order_confirmed",
                title="New Order Received!",
                message=f"Buyer successfully purchased {product_title} (Qty: {quantity}, ₹{order_value}, UPI — PAID). Order ID: {display_id}",
                metadata={
                    "order_id": order_id,
                    "display_id": display_id,
                    "product_title": product_title,
                    "quantity": quantity,
                    "amount": order_value,
                    "payment_method": "UPI",
                    "payment_status": "PAID"
                }
            )

            # 2. Buyer Notification
            create_notification(
                user_id=buyer_id,
                type="order_confirmed",
                title="Payment Successful!",
                message=f"Your order {display_id} for ₹{order_value} was confirmed via Cashfree UPI.",
                metadata={
                    "order_id": order_id,
                    "display_id": display_id,
                    "amount": order_value,
                    "payment_method": "UPI",
                    "payment_status": "PAID",
                    "invoice_number": invoice_number
                }
            )
        except Exception as e:
            logger.error(f"Failed to dispatch post-payment notifications: {e}")

        processed_orders.append(order)

    return {
        "status": "success",
        "orders": processed_orders,
        "payment_status": "paid"
    }

async def fetch_cashfree_order_status(order_id: str) -> Dict[str, Any]:
    """
    Directly queries Cashfree API for the current payment status of an order.
    """
    app_id = (settings.CASHFREE_APP_ID or "").strip()
    secret_key = (settings.CASHFREE_SECRET_KEY or "").strip()

    if not app_id or not secret_key:
        # In sandbox test mode without merchant credentials, default order is ACTIVE (pending payment)
        return {
            "order_status": "ACTIVE",
            "payments": []
        }

    base_url = get_cashfree_base_url()
    headers = get_cashfree_headers()

    async with httpx.AsyncClient(timeout=15.0, verify=False) as client:
        # Fetch payments for the order
        payments_url = f"{base_url}/orders/{order_id}/payments"
        p_res = await client.get(payments_url, headers=headers)
        payments_data = p_res.json() if p_res.status_code == 200 else []

        # Fetch order details
        order_url = f"{base_url}/orders/{order_id}"
        o_res = await client.get(order_url, headers=headers)
        order_data = o_res.json() if o_res.status_code == 200 else {}

        return {
            "order_status": order_data.get("order_status", "ACTIVE"),
            "payments": payments_data if isinstance(payments_data, list) else []
        }
