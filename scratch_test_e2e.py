import urllib.request
import json

def post_json(url, data, headers=None):
    req_data = json.dumps(data).encode('utf-8')
    h = dict(headers or {})
    h['Content-Type'] = 'application/json'
    req = urllib.request.Request(url, data=req_data, headers=h, method='POST')
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

def get_json(url, headers=None):
    h = dict(headers or {})
    req = urllib.request.Request(url, headers=h, method='GET')
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

print("==================================================")
print("1. ARTISAN AUTH & PRODUCT LIST & DETAIL")
print("==================================================")
artisan_auth = post_json('http://localhost:8000/auth/login', {
    'email': 'mounesh93606@gmail.com',
    'password': 'DemoPassword123!'
})
artisan_token = artisan_auth['access_token']
artisan_id = artisan_auth['user']['id']
print(f"Artisan login OK! User ID: {artisan_id}")

artisan_headers = {'Authorization': f'Bearer {artisan_token}'}

# Get Artisan products
my_prods = get_json('http://localhost:8000/products/my', headers=artisan_headers)
print(f"Artisan total products in My Products: {len(my_prods)}")

published_artisan = [p for p in my_prods if p.get('status') == 'published']
draft_artisan = [p for p in my_prods if p.get('status') == 'draft']
print(f"  - Published count: {len(published_artisan)}")
print(f"  - Draft count: {len(draft_artisan)}")

# Pick the first published product
pub_product = published_artisan[0]
pub_id = pub_product['id']

# Get complete product details for Artisan
detail = get_json(f'http://localhost:8000/products/{pub_id}', headers=artisan_headers)
print("\n--- ARTISAN PRODUCT DETAILS (READ-ONLY VIEW) ---")
print(f"  ID: {detail.get('id')}")
print(f"  Title: {detail.get('title')}")
print(f"  Status: {detail.get('status')}")
print(f"  Price: {detail.get('price')}")
print(f"  Category: {detail.get('category')}")
print(f"  Description: {detail.get('description')}")
print(f"  Stock quantity: {detail.get('stock_quantity')}")
print(f"  MOQ: {detail.get('moq')}")
print(f"  Lead time days: {detail.get('lead_time_days')}")
print(f"  Made to order: {detail.get('is_made_to_order')}")
print(f"  Materials: {detail.get('materials')}")
print(f"  Dimensions: {detail.get('dimensions')}")
print(f"  Care instructions: {detail.get('care_instructions')}")
print(f"  Main image: {detail.get('main_image')}")
print(f"  Images array count: {len(detail.get('images', []))}")
for idx, img in enumerate(detail.get('images', [])):
    print(f"    [{idx}] {img.get('image_url')} (is_main={img.get('is_main')})")
print(f"  Artisan name: {detail.get('artisan_name')}")
print(f"  Location: {detail.get('location')}")
print(f"  Passport attached: {detail.get('passport') is not None}")

print("\n==================================================")
print("2. BUYER AUTH & MARKETPLACE VISIBILITY")
print("==================================================")
buyer_auth = post_json('http://localhost:8000/auth/login', {
    'email': 'mouneem33@gmail.com',
    'password': 'DemoPassword123!'
})
buyer_token = buyer_auth['access_token']
buyer_id = buyer_auth['user']['id']
print(f"Buyer login OK! User ID: {buyer_id}")

buyer_headers = {'Authorization': f'Bearer {buyer_token}'}

# Get Buyer Catalogue
catalogue = get_json('http://localhost:8000/products/catalogue/list', headers=buyer_headers)
total = catalogue.get('total')
items = catalogue.get('items', [])
print("Buyer Marketplace total items:", total)
for it in items:
    print(f"  [OK] [{it.get('id')}] {it.get('title')} | Rs.{it.get('price')} | Img: {it.get('main_image')} | Artisan: {it.get('artisan_name')}")

# Verify all published products are visible in catalogue
cat_ids = [it['id'] for it in items]
assert pub_id in cat_ids, f"Published product {pub_id} MUST be in Buyer catalogue!"
print(f"\n[OK] VERIFIED: Published product '{pub_product.get('title')}' is visible in Buyer Marketplace!")

# Verify NO draft products appear in catalogue
for dp in draft_artisan:
    assert dp['id'] not in cat_ids, f"Draft product {dp['id']} MUST NOT appear in Buyer catalogue!"
print(f"[OK] VERIFIED: All {len(draft_artisan)} draft products are properly hidden from Buyer Marketplace!")

# Test Buyer Product Detail
buyer_detail = get_json(f'http://localhost:8000/products/catalogue/detail/{pub_id}', headers=buyer_headers)
b_prod = buyer_detail['product']
b_imgs = buyer_detail.get('images', [])
b_art = buyer_detail.get('artisan', {})

print("\n--- BUYER PRODUCT DETAIL ---")
print(f"  Title: {b_prod.get('title')}")
print(f"  Status: {b_prod.get('status')}")
print(f"  Price: Rs.{b_prod.get('price')}")
print(f"  Category: {b_prod.get('category')}")
print(f"  Description: {b_prod.get('description')}")
print(f"  Stock quantity: {b_prod.get('stock_quantity')}")
print(f"  MOQ: {b_prod.get('moq')}")
print(f"  Lead time days: {b_prod.get('lead_time_days')}")
print(f"  Materials: {b_prod.get('materials')}")
print(f"  Images count: {len(b_imgs)}")
for idx, img in enumerate(b_imgs):
    print(f"    [{idx}] {img.get('image_url')}")
print(f"  Artisan name: {b_art.get('artisan_name')}")
print(f"  Artisan location: {b_art.get('location')}")

assert len(b_imgs) > 0, "Buyer detail MUST have actual images!"
assert b_imgs[0].get('image_url'), "Buyer detail image_url must not be empty!"
print("[OK] VERIFIED: Buyer sees actual image URL and full read-only details!")

# Verify draft product cannot be viewed by Buyer (404)
if draft_artisan:
    draft_sample_id = draft_artisan[0]['id']
    try:
        get_json(f'http://localhost:8000/products/catalogue/detail/{draft_sample_id}', headers=buyer_headers)
        raise AssertionError("Draft product was accessible by Buyer!")
    except urllib.error.HTTPError as e:
        assert e.code == 404, f"Expected 404 for draft product, got {e.code}"
        print(f"[OK] VERIFIED: Draft product correctly returns 404 for Buyer (status: {e.code})!")

print("\n==================================================")
print("ALL VERIFICATIONS PASSED SUCCESSFULLY!")
print("==================================================")
