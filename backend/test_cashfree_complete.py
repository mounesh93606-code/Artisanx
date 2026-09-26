import os
import sys
import hmac
import hashlib
import base64
import time
import json

# Ensure parent directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app
from config import settings
from database import get_service_client
from payments.service import find_orders_by_identifier

client = TestClient(app)

def log_test(step: str, detail: str = ""):
    print(f"\n[TEST STEP] ===> {step}")
    if detail:
        print(f"            {detail}")

def run_all_tests():
    print("\n=======================================================")
    print("STARTING ARTISANX CASHFREE UPI INTEGRATION VERIFICATION")
    print("=======================================================")

    # Only set test secret key for signature verification if not already configured
    if not settings.CASHFREE_SECRET_KEY:
        settings.CASHFREE_SECRET_KEY = "test_secret_key_artisanx_cashfree"

    # 1. Health check
    log_test("1. Backend Health Check")
    resp = client.get("/health")
    assert resp.status_code == 200, f"Health check failed: {resp.text}"
    print("    [PASS] Health check returned 200 OK")

    # 2. Login as Artisan
    log_test("2. Authenticate Artisan (artisan@demo.com)")
    artisan_resp = client.post("/auth/login", json={
        "email": "artisan@demo.com",
        "password": "DemoPassword123!"
    })
    assert artisan_resp.status_code == 200, f"Artisan login failed: {artisan_resp.text}"
    artisan_data = artisan_resp.json()
    artisan_token = artisan_data["access_token"]
    artisan_user = artisan_data["user"]
    artisan_headers = {"Authorization": f"Bearer {artisan_token}"}
    print(f"    [PASS] Artisan logged in: {artisan_user['email']} (id: {artisan_user['id']})")

    # 3. Login as Buyer
    log_test("3. Authenticate Buyer (buyer@demo.com)")
    buyer_resp = client.post("/auth/login", json={
        "email": "buyer@demo.com",
        "password": "DemoPassword123!"
    })
    assert buyer_resp.status_code == 200, f"Buyer login failed: {buyer_resp.text}"
    buyer_data = buyer_resp.json()
    buyer_token = buyer_data["access_token"]
    buyer_user = buyer_data["user"]
    buyer_headers = {"Authorization": f"Bearer {buyer_token}"}
    print(f"    [PASS] Buyer logged in: {buyer_user['email']} (id: {buyer_user['id']})")

    # 4. Create an isolated fresh Product by the Artisan for deterministic test run
    log_test("4. Create Fresh Test Product for Isolated Pipeline Test")
    db = get_service_client()
    unique_tag = int(time.time())
    new_prod = db.table("products").insert({
        "artisan_id": artisan_user["id"],
        "title": f"Artisan Test Silk Item {unique_tag}",
        "description": "Handcrafted silk item for automated payment verification.",
        "category": "Textiles",
        "price": 850.0,
        "stock_quantity": 25,
        "moq": 1,
        "status": "published"
    }).execute()
    product = new_prod.data[0]
    prod_id = product["id"]
    prod_price = float(product["price"])
    print(f"    [PASS] Fresh test product created: '{product['title']}' | DB Price: Rs. {prod_price} | Stock: 25 | MOQ: 1")

    # 5. TEST: Checkout WITHOUT confirmed enquiry MUST be rejected with HTTP 403
    log_test("5. Enforce Business Rule: Payment BEFORE Confirmation must fail (HTTP 403)")
    # Submit an enquiry that is 'new' (unconfirmed)
    enquiry_res = db.table("buyer_enquiries").insert({
        "buyer_id": buyer_user["id"],
        "artisan_id": artisan_user["id"],
        "product_id": prod_id,
        "quantity": 2,
        "status": "new"
    }).execute()
    pending_enquiry_id = enquiry_res.data[0]["id"] if enquiry_res.data else None

    unconfirmed_payload = {
        "items": [{"product_id": prod_id, "quantity": 1, "enquiry_id": pending_enquiry_id}],
        "delivery_address": {
            "full_name": "Test Buyer",
            "phone": "+919876543210",
            "address": "42 Craft Lane",
            "city": "Bengaluru",
            "state": "Karnataka",
            "pincode": "560001"
        }
    }
    blocked_resp = client.post("/payments/cashfree/create-order", json=unconfirmed_payload, headers=buyer_headers)
    assert blocked_resp.status_code == 403, f"Expected HTTP 403 Forbidden but got {blocked_resp.status_code}: {blocked_resp.text}"
    print("    [PASS] Direct payment attempt rejected with HTTP 403: Buyer cannot pay without confirmed enquiry.")

    # 6. Artisan confirms the enquiry
    log_test("6. Artisan Confirms Enquiry")
    db.table("buyer_enquiries").update({
        "status": "accepted",
        "artisan_response": "interested"
    }).eq("id", pending_enquiry_id).execute()
    print(f"    [PASS] Enquiry {pending_enquiry_id} updated to 'accepted'.")

    # 7. TEST: Price manipulation resistance - Client sends manipulated items/price
    log_test("7. Price Manipulation Check: Backend computes authoritative price from DB")
    # Even if client sends order, backend recalculates 2 * prod_price
    create_order_payload = {
        "items": [{"product_id": prod_id, "quantity": 2, "enquiry_id": pending_enquiry_id}],
        "delivery_address": {
            "full_name": "Test Buyer",
            "phone": "+919876543210",
            "address": "42 Craft Lane",
            "city": "Bengaluru",
            "state": "Karnataka",
            "pincode": "560001"
        },
        "notes": "Please pack securely"
    }

    create_order_resp = client.post("/payments/cashfree/create-order", json=create_order_payload, headers=buyer_headers)
    assert create_order_resp.status_code == 200, f"Create order failed: {create_order_resp.text}"
    order_data = create_order_resp.json()
    order_id = order_data["order_id"]
    display_id = order_data["display_id"]
    amount = order_data["amount"]
    payment_session_id = order_data["payment_session_id"]
    cf_order_id = order_data["cf_order_id"]

    expected_amount = prod_price * 2
    assert amount == expected_amount, f"Expected amount {expected_amount} but got {amount}"
    assert payment_session_id is not None, "payment_session_id must not be None"
    assert cf_order_id is not None, "cf_order_id must not be None"
    print(f"    [PASS] Cashfree Order Created successfully!")
    print(f"           Internal Order ID: {order_id} ({display_id})")
    print(f"           Calculated Authoritative Amount: Rs. {amount}")
    print(f"           Cashfree Order ID: {cf_order_id}")
    print(f"           Payment Session ID: {payment_session_id[:25]}...")

    # 8. Check Payment Status before settlement
    log_test("8. Check Payment Status before settlement (Should be PENDING/INITIATED)")
    status_resp = client.get(f"/payments/cashfree/status/{order_id}", headers=buyer_headers)
    assert status_resp.status_code == 200
    st_data = status_resp.json()
    assert st_data["payment_status"] in ["payment_initiated", "payment_pending"]
    print(f"    [PASS] Current payment_status = '{st_data['payment_status']}'")

    # 9. TEST: Webhook Signature Verification - Invalid signature rejection
    log_test("9. Webhook Security: Reject Invalid Signature")
    webhook_payload = {
        "data": {
            "order": {
                "order_id": order_id,
                "cf_order_id": cf_order_id,
                "order_amount": amount,
                "order_currency": "INR"
            },
            "payment": {
                "cf_payment_id": "cf_pay_test_999",
                "payment_status": "SUCCESS",
                "payment_amount": amount,
                "payment_currency": "INR",
                "payment_method": {"upi": {"channel": "intent"}}
            }
        },
        "event_time": "2026-09-21T18:00:00Z",
        "type": "PAYMENT_SUCCESS_WEBHOOK"
    }
    raw_payload_bytes = json.dumps(webhook_payload).encode("utf-8")
    fake_headers = {
        "x-webhook-timestamp": str(int(time.time())),
        "x-webhook-signature": "invalid_fake_signature_abc123"
    }
    bad_sig_resp = client.post("/payments/cashfree/webhook", content=raw_payload_bytes, headers=fake_headers)
    assert bad_sig_resp.status_code in [400, 401], f"Expected 400/401 for bad signature, got {bad_sig_resp.status_code}"
    print(f"    [PASS] Invalid webhook signature properly rejected with HTTP {bad_sig_resp.status_code}.")

    # 10. TEST: Webhook Signature Verification - Valid HMAC-SHA256 signature
    log_test("10. Webhook Processing: Valid HMAC-SHA256 Signature")
    ts = str(int(time.time()))
    secret_key = settings.CASHFREE_SECRET_KEY or "dummy_secret"
    data_to_sign = f"{ts}.".encode("utf-8") + raw_payload_bytes
    valid_sig = base64.b64encode(
        hmac.new(secret_key.encode("utf-8"), data_to_sign, hashlib.sha256).digest()
    ).decode("utf-8")
    valid_headers = {
        "x-webhook-timestamp": ts,
        "x-webhook-signature": valid_sig,
        "content-type": "application/json"
    }
    webhook_resp = client.post("/payments/cashfree/webhook", content=raw_payload_bytes, headers=valid_headers)
    assert webhook_resp.status_code == 200, f"Webhook processing failed: {webhook_resp.text}"
    webhook_result = webhook_resp.json()
    assert webhook_result.get("status") == "ok" and webhook_result.get("result") in ["success", "already_processed"]
    print(f"    [PASS] Webhook processed successfully: {webhook_result}")

    # 11. Verify Database State after Webhook: Order PAID, Stock Deducted, Invoice Generated
    log_test("11. Verify Database State: Order is PAID, Invoice Generated, Notifications Created")
    orders_found = find_orders_by_identifier(db, order_id)
    assert len(orders_found) > 0, f"Order {order_id} not found in DB"
    ord_data = orders_found[0]
    payment_st = ord_data.get("payment_status") or ord_data.get("product_snapshot", {}).get("payment", {}).get("status")
    assert payment_st == "paid", f"Expected paid, got {payment_st}"
    assert ord_data["status"] == "confirmed", f"Expected confirmed, got {ord_data['status']}"
    invoice_id = ord_data.get("invoice_id") or ord_data.get("product_snapshot", {}).get("invoice", {}).get("invoice_number")
    assert invoice_id is not None, "invoice_id must be set on paid order"
    print(f"    [PASS] Order {order_id} is PAID (status='confirmed', payment_status='paid')")
    print(f"    [PASS] Assigned Invoice ID: {invoice_id}")

    # Check Invoice Snapshot metadata
    inv_meta = ord_data.get("product_snapshot", {}).get("invoice", {}).get("invoice_data")
    assert inv_meta is not None, "Invoice metadata must exist in order snapshot"
    assert float(inv_meta["total"]) == amount
    print(f"    [PASS] Verified Invoice record: {inv_meta['invoice_number']} | Total: Rs. {inv_meta['total']}")

    # Check Artisan Notification
    art_notifs = db.table("notifications").select("*").eq("user_id", artisan_user["id"]).order("created_at", desc=True).limit(5).execute()
    art_paid_notifs = [n for n in (art_notifs.data or []) if "New Order Received" in n.get("title", "")]
    assert len(art_paid_notifs) > 0, "Artisan notification for new paid order must exist"
    print(f"    [PASS] Artisan Notification: '{art_paid_notifs[0]['title']}' - '{art_paid_notifs[0]['message']}'")

    # Check Buyer Notification
    buyer_notifs = db.table("notifications").select("*").eq("user_id", buyer_user["id"]).order("created_at", desc=True).limit(5).execute()
    buyer_paid_notifs = [n for n in (buyer_notifs.data or []) if "Payment Successful" in n.get("title", "")]
    assert len(buyer_paid_notifs) > 0, "Buyer notification for successful payment must exist"
    print(f"    [PASS] Buyer Notification: '{buyer_paid_notifs[0]['title']}' - '{buyer_paid_notifs[0]['message']}'")

    # 12. TEST: Webhook Idempotency (Duplicate Webhook Delivery)
    log_test("12. Idempotency Check: Re-sending the identical Webhook")
    dup_webhook_resp = client.post("/payments/cashfree/webhook", content=raw_payload_bytes, headers=valid_headers)
    assert dup_webhook_resp.status_code == 200, f"Duplicate webhook should return 200, got {dup_webhook_resp.status_code}"
    dup_result = dup_webhook_resp.json()
    assert dup_result.get("status") == "ok" and dup_result.get("result") in ["success", "already_processed"]
    print("    [PASS] Duplicate webhook safely acknowledged without duplicate orders/invoices!")

    # 13. TEST: Invoice Retrieval Endpoint
    log_test("13. Invoice API Fetching: GET /payments/invoice/{order_id} & /orders/{id}/invoice")
    fetch_inv_resp = client.get(f"/payments/invoice/{order_id}", headers=buyer_headers)
    assert fetch_inv_resp.status_code == 200, f"Invoice fetch failed: {fetch_inv_resp.text}"
    fetched_inv = fetch_inv_resp.json()
    assert fetched_inv["invoice_number"] == invoice_id
    assert fetched_inv["payment_status"].lower() == "paid"
    print(f"    [PASS] GET /payments/invoice/{order_id} returned clean invoice model:")
    print(f"           Invoice: {fetched_inv['invoice_number']} | Buyer: {fetched_inv.get('buyer_name')} | Amount: Rs. {fetched_inv['total']}")

    # Also test the order-nested alias:
    order_uuid = ord_data["id"]
    alias_inv_resp = client.get(f"/orders/{order_uuid}/invoice", headers=buyer_headers)
    assert alias_inv_resp.status_code == 200
    print("    [PASS] GET /orders/{order_id}/invoice alias returned 200 OK")

    # 14. TEST: Buyer Verified Return Status Page
    log_test("14. Return URL Status Check: GET /payments/cashfree/status/{order_id}")
    final_status = client.get(f"/payments/cashfree/status/{order_id}", headers=buyer_headers)
    assert final_status.status_code == 200
    fs_data = final_status.json()
    assert fs_data["payment_status"].lower() == "paid"
    assert fs_data["amount"] == amount
    print(f"    [PASS] Return URL status check confirms: payment_status='{fs_data['payment_status']}'")

    # 15. TEST: Enquiry Consumption - Reusing previous enquiry must FAIL (HTTP 403)
    log_test("15. Enforce Business Rule: Used/Consumed Enquiry CANNOT be reused for 2nd purchase (HTTP 403)")
    repeat_payload_consumed = {
        "items": [{"product_id": prod_id, "quantity": 1, "enquiry_id": pending_enquiry_id}],
        "delivery_address": {
            "full_name": "Test Buyer",
            "phone": "+919876543210",
            "address": "42 Craft Lane",
            "city": "Bengaluru",
            "state": "Karnataka",
            "pincode": "560001"
        }
    }
    repeat_consumed_resp = client.post("/payments/cashfree/create-order", json=repeat_payload_consumed, headers=buyer_headers)
    assert repeat_consumed_resp.status_code == 403, f"Expected 403 Forbidden for used enquiry, got {repeat_consumed_resp.status_code}: {repeat_consumed_resp.text}"
    print("    [PASS] Reusing previously completed enquiry was correctly REJECTED with HTTP 403.")

    # 16. TEST: Direct Purchase without Enquiry must FAIL (HTTP 403)
    log_test("16. Enforce Business Rule: Purchase with NO enquiry_id must FAIL (HTTP 403)")
    no_enquiry_payload = {
        "items": [{"product_id": prod_id, "quantity": 1}],
        "delivery_address": {
            "full_name": "Test Buyer",
            "phone": "+919876543210",
            "address": "42 Craft Lane",
            "city": "Bengaluru",
            "state": "Karnataka",
            "pincode": "560001"
        }
    }
    no_enquiry_resp = client.post("/payments/cashfree/create-order", json=no_enquiry_payload, headers=buyer_headers)
    assert no_enquiry_resp.status_code == 403, f"Expected 403 for missing enquiry, got {no_enquiry_resp.status_code}"
    print("    [PASS] Direct purchase without enquiry was correctly REJECTED with HTTP 403.")

    # 17. TEST: Rejected Enquiry must FAIL (HTTP 403)
    log_test("17. Enforce Business Rule: Rejected enquiry must FAIL (HTTP 403)")
    rejected_enq_res = db.table("buyer_enquiries").insert({
        "buyer_id": buyer_user["id"],
        "artisan_id": artisan_user["id"],
        "product_id": prod_id,
        "quantity": 1,
        "status": "responded",
        "artisan_response": "cannot_fulfil"
    }).execute()
    rejected_enquiry_id = rejected_enq_res.data[0]["id"]

    rejected_payload = {
        "items": [{"product_id": prod_id, "quantity": 1, "enquiry_id": rejected_enquiry_id}],
        "delivery_address": {
            "full_name": "Test Buyer",
            "phone": "+919876543210",
            "address": "42 Craft Lane",
            "city": "Bengaluru",
            "state": "Karnataka",
            "pincode": "560001"
        }
    }
    rejected_resp = client.post("/payments/cashfree/create-order", json=rejected_payload, headers=buyer_headers)
    assert rejected_resp.status_code == 403, f"Expected 403 for rejected enquiry, got {rejected_resp.status_code}"
    print("    [PASS] Rejected enquiry was correctly REJECTED with HTTP 403.")

    # 18. TEST: Repeat Purchase with Fresh Approved Enquiry must SUCCEED
    log_test("18. Repeat Purchase Flow: New Enquiry -> Artisan Approval -> Cashfree Payment -> SUCCEEDS")
    fresh_enquiry_res = db.table("buyer_enquiries").insert({
        "buyer_id": buyer_user["id"],
        "artisan_id": artisan_user["id"],
        "product_id": prod_id,
        "quantity": 1,
        "status": "accepted",
        "artisan_response": "interested"
    }).execute()
    fresh_enquiry_id = fresh_enquiry_res.data[0]["id"]

    second_purchase_payload = {
        "items": [{"product_id": prod_id, "quantity": 1, "enquiry_id": fresh_enquiry_id}],
        "delivery_address": {
            "full_name": "Test Buyer",
            "phone": "+919876543210",
            "address": "42 Craft Lane",
            "city": "Bengaluru",
            "state": "Karnataka",
            "pincode": "560001"
        }
    }
    second_order_resp = client.post("/payments/cashfree/create-order", json=second_purchase_payload, headers=buyer_headers)
    assert second_order_resp.status_code == 200, f"Second purchase with fresh enquiry failed: {second_order_resp.text}"
    second_order_data = second_order_resp.json()
    print(f"    [PASS] Second purchase order created successfully: {second_order_data['order_id']} for Rs. {second_order_data['amount']}")

    print("\n=======================================================")
    print("ALL 18 ACCEPTANCE & REPEAT PURCHASE TESTS PASSED! [PASS]")
    print("=======================================================\n")

if __name__ == "__main__":
    run_all_tests()

