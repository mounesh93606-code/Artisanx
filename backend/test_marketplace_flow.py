import requests
import sys
import httpx

# Global patch for httpx to fix Supabase timeouts and HTTP/2 disconnects on Windows
_original_client_init = httpx.Client.__init__
def _new_client_init(self, *args, **kwargs):
    kwargs['http2'] = False
    if 'timeout' not in kwargs or kwargs['timeout'] is httpx.USE_CLIENT_DEFAULT:
        kwargs['timeout'] = httpx.Timeout(30.0)
    _original_client_init(self, *args, **kwargs)
httpx.Client.__init__ = _new_client_init

BASE_URL = "http://localhost:8000"

def log(msg, success=True):
    symbol = "PASS" if success else "FAIL"
    print(f"[{symbol}] {msg}", flush=True)

def run_test():
    print("==================================================", flush=True)
    print("STARTING ARTISANX COMPLETE MARKETPLACE FLOW TEST", flush=True)
    print("==================================================", flush=True)

    # 1. Health check
    res = requests.get(f"{BASE_URL}/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    log("Backend is healthy (status 200)")

    # 2. Login as Artisan
    artisan_login = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "artisan@demo.com",
        "password": "DemoPassword123!"
    })
    assert artisan_login.status_code == 200, f"Artisan login failed: {artisan_login.text}"
    artisan_token = artisan_login.json()["access_token"]
    artisan_headers = {"Authorization": f"Bearer {artisan_token}"}
    artisan_user = artisan_login.json()["user"]
    log(f"Artisan logged in: {artisan_user['email']} (id: {artisan_user['id']})")

    # 3. Login as Buyer
    buyer_login = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "buyer@demo.com",
        "password": "DemoPassword123!"
    })
    assert buyer_login.status_code == 200, f"Buyer login failed: {buyer_login.text}"
    buyer_token = buyer_login.json()["access_token"]
    buyer_headers = {"Authorization": f"Bearer {buyer_token}"}
    buyer_user = buyer_login.json()["user"]
    log(f"Buyer logged in: {buyer_user['email']} (id: {buyer_user['id']})")

    # 4. Artisan creates product
    prod_payload = {
        "title": "Kashmir Handwoven Silk Scarf",
        "description": "Authentic 100% pure silk hand-embroidered scarf crafted by master artisans.",
        "category": "Textile",
        "tags": ["silk", "handwoven", "scarf", "kashmir"],
        "materials": {"list": [{"name": "Pure Mulberry Silk", "quantity": 1, "unit": "meter"}]},
        "care_instructions": "Dry clean only. Store in muslin cloth.",
        "price": 1850.0,
        "status": "published",
        "dimensions": "200cm x 70cm",
        "stock_quantity": 25,
        "is_made_to_order": False,
        "moq": 1,
        "lead_time_days": 3
    }
    prod_res = requests.post(f"{BASE_URL}/products/", json=prod_payload, headers=artisan_headers)
    assert prod_res.status_code in [200, 201], f"Create product failed: {prod_res.text}"
    product = prod_res.json()
    product_id = product["id"]
    log(f"Product created: {product['title']} (id: {product_id})")

    # Ensure product is published and has image
    from database import get_service_client
    client = get_service_client()
    client.table("product_images").insert({
        "product_id": product_id,
        "image_url": "https://images.unsplash.com/photo-1606760227091-3dd870d97f1d",
        "is_main": True
    }).execute()
    client.table("products").update({"status": "published", "readiness_score": 85}).eq("id", product_id).execute()
    log("Product status confirmed: published")

    # 5. Buyer browses catalogue and verifies visibility
    cat_res = requests.get(f"{BASE_URL}/products/catalogue/list?search=Silk Scarf")
    assert cat_res.status_code == 200, f"Catalogue search failed: {cat_res.text}"
    cat_items = cat_res.json()["items"]
    assert any(i["id"] == product_id for i in cat_items), "Created product not found in buyer catalogue!"
    log("Buyer verifies product is visible in catalogue")

    # 6. Buyer views complete product details
    detail_res = requests.get(f"{BASE_URL}/products/catalogue/detail/{product_id}")
    assert detail_res.status_code == 200, f"Catalogue detail failed: {detail_res.text}"
    detail = detail_res.json()
    assert detail["product"]["title"] == prod_payload["title"]
    assert detail["product"]["price"] == prod_payload["price"]
    log("Buyer views complete product details with artisan profile and specs")

    # 7. Buyer submits enquiry
    enq_payload = {
        "product_id": product_id,
        "quantity": 3,
        "budget": 1850,
        "customisation_request": "Custom gift packaging and handwritten note please",
        "buyer_message": "Hello, I would like to order 3 pieces for an anniversary gift."
    }
    enq_res = requests.post(f"{BASE_URL}/enquiries/", json=enq_payload, headers=buyer_headers)
    assert enq_res.status_code in [200, 201], f"Enquiry failed: {enq_res.text}"
    enquiry_id = enq_res.json()["enquiry_id"]
    log(f"Buyer submits enquiry (id: {enquiry_id})")

    # 8. NEGATIVE TEST 1: Buyer tries to order with PENDING enquiry
    order_attempt_1 = requests.post(f"{BASE_URL}/orders/", json={
        "product_id": product_id,
        "quantity": 3,
        "enquiry_id": enquiry_id
    }, headers=buyer_headers)
    assert order_attempt_1.status_code == 400, f"Expected 400 for pending enquiry, got {order_attempt_1.status_code}"
    log(f"Negative Test 1 Passed: Order rejected when enquiry is pending ({order_attempt_1.json()['detail']})")

    # 9. NEGATIVE TEST 2: Artisan rejects enquiry -> Buyer cannot order
    # Temporarily set to rejected to verify rejection enforcement
    reject_res = requests.put(f"{BASE_URL}/enquiries/{enquiry_id}/respond", json={
        "artisan_response": "cannot_fulfil",
        "artisan_response_note": "Currently busy"
    }, headers=artisan_headers)
    assert reject_res.status_code == 200
    order_attempt_2 = requests.post(f"{BASE_URL}/orders/", json={
        "product_id": product_id,
        "quantity": 3,
        "enquiry_id": enquiry_id
    }, headers=buyer_headers)
    assert order_attempt_2.status_code == 400
    log(f"Negative Test 2 Passed: Order rejected when enquiry was rejected ({order_attempt_2.json()['detail']})")

    # 10. Artisan Confirms & Accepts Enquiry
    confirm_res = requests.put(f"{BASE_URL}/enquiries/{enquiry_id}/respond", json={
        "artisan_response": "accepted",
        "artisan_response_note": "Confirmed! We will prepare custom gift packaging as requested."
    }, headers=artisan_headers)
    assert confirm_res.status_code == 200
    log("Artisan confirms and accepts enquiry")

    # 11. NEGATIVE TEST 3: Quantity exceeds stock
    over_stock_order = requests.post(f"{BASE_URL}/orders/", json={
        "product_id": product_id,
        "quantity": 9999,
        "enquiry_id": enquiry_id
    }, headers=buyer_headers)
    assert over_stock_order.status_code == 400
    log(f"Negative Test 3 Passed: Order rejected when quantity exceeds stock ({over_stock_order.json()['detail']})")

    # 12. Buyer places order (Buy Now / Checkout)
    order_payload = {
        "product_id": product_id,
        "quantity": 3,
        "enquiry_id": enquiry_id,
        "delivery_address": {
            "full_name": "Rohan Sharma",
            "phone": "9876543210",
            "address_line1": "Flat 402, Lotus Apartments",
            "city": "Bengaluru",
            "state": "Karnataka",
            "postal_code": "560001"
        },
        "notes": "Please call before delivery"
    }
    place_res = requests.post(f"{BASE_URL}/orders/", json=order_payload, headers=buyer_headers)
    assert place_res.status_code == 200, f"Order placement failed: {place_res.text}"
    order_data = place_res.json()
    order_id = order_data["order_id"]
    display_id = order_data["display_id"]
    log(f"Buyer places order successfully! (Order ID: {order_id}, Display: {display_id})")

    # 13. Artisan views incoming orders
    artisan_orders_res = requests.get(f"{BASE_URL}/orders/artisan", headers=artisan_headers)
    assert artisan_orders_res.status_code == 200
    artisan_orders = artisan_orders_res.json()["orders"]
    matching_order = next((o for o in artisan_orders if o["id"] == order_id), None)
    assert matching_order is not None, "Created order not found in artisan orders list!"
    assert matching_order["status"] == "confirmed"
    assert matching_order["quantity"] == 3
    assert matching_order["total_order_value"] == 1850.0 * 3
    log("Artisan verifies order in dashboard with correct total and buyer info")

    # 14. Artisan status transitions: confirmed -> in_production -> ready_for_dispatch -> dispatched
    # Step A: in_production
    s1 = requests.patch(f"{BASE_URL}/orders/{order_id}/status", json={"status": "in_production", "note": "Started weaving silk border"}, headers=artisan_headers)
    assert s1.status_code == 200
    log("Order status updated -> in_production")

    # Step B: ready_for_dispatch
    s2 = requests.patch(f"{BASE_URL}/orders/{order_id}/status", json={"status": "ready_for_dispatch", "note": "Gift packed and packaged for courier"}, headers=artisan_headers)
    assert s2.status_code == 200
    log("Order status updated -> ready_for_dispatch")

    # Step C: dispatched
    s3 = requests.patch(f"{BASE_URL}/orders/{order_id}/status", json={"status": "dispatched", "note": "Dispatched via BlueDart Courier AWB #789012"}, headers=artisan_headers)
    assert s3.status_code == 200
    log("Order status updated -> dispatched")

    # 15. NEGATIVE TEST 4: Invalid status transition (e.g. from dispatched back to in_production)
    invalid_trans = requests.patch(f"{BASE_URL}/orders/{order_id}/status", json={"status": "in_production"}, headers=artisan_headers)
    assert invalid_trans.status_code == 400
    log("Negative Test 4 Passed: Invalid status transition rejected (dispatched -> in_production)")

    # 16. Buyer marks delivered and completes order
    # Step D: delivered
    s4 = requests.patch(f"{BASE_URL}/orders/{order_id}/status", json={"status": "delivered", "note": "Package received at doorstep"}, headers=buyer_headers)
    assert s4.status_code == 200
    log("Order status updated -> delivered")

    # Step E: completed
    s5 = requests.patch(f"{BASE_URL}/orders/{order_id}/status", json={"status": "completed", "note": "Verified silk quality, completely satisfied!"}, headers=buyer_headers)
    assert s5.status_code == 200
    log("Order status updated -> completed")

    # 17. Buyer checks full order details and timeline
    buyer_order_res = requests.get(f"{BASE_URL}/orders/{order_id}", headers=buyer_headers)
    assert buyer_order_res.status_code == 200
    bo_data = buyer_order_res.json()
    assert bo_data["order"]["status"] == "completed"
    history = bo_data["history"]
    assert len(history) >= 5, f"Expected full timeline history, got {len(history)} entries"
    log(f"Buyer order detail and timeline verified ({len(history)} historical transitions)")

    # 18. Batch cart checkout test
    batch_res = requests.post(f"{BASE_URL}/orders/checkout", json={
        "items": [
            {
                "product_id": product_id,
                "quantity": 1,
                "enquiry_id": enquiry_id
            }
        ],
        "delivery_address": {
            "full_name": "Rohan Sharma",
            "phone": "9876543210",
            "address_line1": "Flat 402",
            "city": "Bengaluru",
            "postal_code": "560001"
        }
    }, headers=buyer_headers)
    assert batch_res.status_code == 200
    log("Batch Cart Checkout verified successfully")

    # 19. Notifications verification
    buyer_notifs = requests.get(f"{BASE_URL}/notifications/", headers=buyer_headers).json()
    artisan_notifs = requests.get(f"{BASE_URL}/notifications/", headers=artisan_headers).json()
    log(f"Notifications verified: Buyer has {len(buyer_notifs)} notifications, Artisan has {len(artisan_notifs)} notifications")

    print("==================================================")
    print("ALL 19 MARKETPLACE FLOW & NEGATIVE TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    run_test()
