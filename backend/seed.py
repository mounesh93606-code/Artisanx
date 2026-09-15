import os
import sys
from dotenv import load_dotenv

# Add backend directory to sys.path to ensure modules can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import get_supabase_client, get_authenticated_client, get_service_client
from products.service import calculate_readiness
from guidance.workflows import WORKFLOWS
from supabase.client import Client

DEMO_USERS = [
    {"email": "artisan@demo.com", "role": "artisan", "name": "Lakshmi Devi"},
    {"email": "buyer@demo.com", "role": "buyer", "name": "Demo Buyer"},
    {"email": "facilitator@demo.com", "role": "facilitator", "name": "Demo Facilitator"}
]
PASSWORD = "DemoPassword123!"

def print_step(step, total, msg):
    print(f"\033[96m[{step}/{total}]\033[0m {msg}")

def ensure_users_exist(admin_client: Client):
    created = 0
    skipped = 0
    tokens = {}
    for user_data in DEMO_USERS:
        email = user_data["email"]
        try:
            # Try logging in
            res = get_supabase_client().auth.sign_in_with_password({"email": email, "password": PASSWORD})
            tokens[user_data["role"]] = {"token": res.session.access_token, "user": res.user}
            skipped += 1
        except Exception as e:
            # User might not exist, create via admin
            try:
                user_res = admin_client.auth.admin.create_user({
                    "email": email,
                    "password": PASSWORD,
                    "email_confirm": True
                })
                user_obj = user_res.user if hasattr(user_res, 'user') else user_res
                admin_client.table("users").upsert({
                    "id": user_obj.id,
                    "email": email,
                    "role": user_data["role"],
                    "display_name": user_data["name"],
                    "preferred_language": "en"
                }).execute()
                res = get_supabase_client().auth.sign_in_with_password({"email": email, "password": PASSWORD})
                tokens[user_data["role"]] = {"token": res.session.access_token, "user": res.user}
                created += 1
            except Exception as ex:
                print(f"Error creating user {email}: {ex}")
    print_step(1, 5, f"Demo users: Created {created}, Skipped {skipped}")
    return tokens

def seed_artisan_profile(artisan_token_data):
    token = artisan_token_data["token"]
    user = artisan_token_data["user"]
    client = get_authenticated_client(token)
    
    res = client.table("artisan_profiles").select("id").eq("user_id", user.id).execute()
    if not res.data:
        client.table("artisan_profiles").insert({
            "user_id": user.id,
            "artisan_name": "Lakshmi Devi",
            "business_name": "Lakshmi Weaves",
            "craft_type": "Weaving",
            "craft_category": "Silk Sarees",
            "location": "Kanchipuram, Tamil Nadu",
            "years_experience": 15,
            "verification_status": "cooperative_verified"
        }).execute()
        print_step(2, 5, "Artisan profile: Created Lakshmi Devi")
    else:
        # Ensure it's verified
        client.table("artisan_profiles").update({"verification_status": "cooperative_verified"}).eq("user_id", user.id).execute()
        print_step(2, 5, "Artisan profile: Skipped Lakshmi Devi (already exists)")

def seed_products(artisan_token_data):
    token = artisan_token_data["token"]
    user = artisan_token_data["user"]
    client = get_authenticated_client(token)
    
    products_to_seed = [
        {
            # Kanchipuram Silk Saree (100)
            "title": "Kanchipuram Silk Saree - Bridal Collection",
            "description": "Authentic handwoven Kanchipuram silk saree with intricate pure zari borders featuring traditional mango and peacock motifs. Takes 25 days to weave by master artisans.",
            "category": "Apparel",
            "tags": ["bridal", "silk", "handwoven", "kanchipuram", "traditional"],
            "materials": {"list": ["Pure Mulberry Silk", "Silver Zari", "Gold Thread"]},
            "price": 25000,
            "stock_quantity": 3,
            "moq": 1,
            "lead_time_days": 30,
            "dimensions": "6.2 meters with blouse piece",
            "care_instructions": "Dry clean only. Store in a cotton muslin cloth.",
            "customisation_available": True,
            "images": [
                {"image_url": "https://example.com/saree-main.jpg", "is_main": True},
                {"image_url": "https://example.com/saree-alt1.jpg", "is_main": False},
                {"image_url": "https://example.com/saree-alt2.jpg", "is_main": False},
            ],
            "target_status": "published"
        },
        {
            # Cotton Handloom Kurta (85)
            "title": "Mangalagiri Cotton Handloom Kurta",
            "description": "Breathable and comfortable straight cut kurta made from pure Mangalagiri cotton. Features traditional Nizam borders.",
            "category": "Apparel",
            "tags": ["cotton", "everyday", "handloom", "kurta"],
            "materials": {"list": ["Mangalagiri Cotton", "Natural Dyes"]},
            "price": 1800,
            "stock_quantity": 10,
            "moq": 1,
            "lead_time_days": 7,
            "dimensions": "Available in S, M, L, XL",
            "care_instructions": "Hand wash separate in cold water. Shadow dry.",
            "images": [], # Intentionally omitting images to lower score
            "target_status": "published"
        },
        {
            # Silk Stole (65)
            "title": "Eri Silk Stole with Zari Border",
            "description": "Ahimsa (Eri) silk stole handwoven in Assam. Naturally dyed with madder root. Very soft and warm.",
            "category": "Accessories",
            "tags": ["stole", "eri silk", "ahimsa silk", "natural dye"],
            "materials": {"list": ["Eri Silk", "Madder Root Dye"]},
            "price": 3200,
            "stock_quantity": 5,
            "moq": 5,
            "lead_time_days": None,
            "dimensions": None,
            "care_instructions": None,
            "images": [],
            "target_status": "draft"
        },
        {
            # Temple Jewelry (40)
            "title": "Traditional Temple Jewelry Set - Laxmi Motif",
            "description": "Handcrafted temple jewelry set featuring Goddess Laxmi motif. Perfect for classical dance performances and weddings.",
            "category": "Jewelry",
            "tags": [],
            "materials": None,
            "price": 4500,
            "stock_quantity": None,
            "moq": None,
            "lead_time_days": None,
            "dimensions": None,
            "care_instructions": None,
            "images": [],
            "target_status": "draft"
        },
        {
            # Handwoven Table Runner (20)
            "title": "Handwoven Ikat Table Runner",
            "description": "",
            "category": "Home Decor",
            "tags": [],
            "materials": None,
            "price": None,
            "stock_quantity": None,
            "moq": None,
            "lead_time_days": None,
            "dimensions": None,
            "care_instructions": None,
            "images": [],
            "target_status": "draft"
        }
    ]
    
    inserted = 0
    skipped = 0
    for prod_def in products_to_seed:
        res = client.table("products").select("id").eq("title", prod_def["title"]).eq("artisan_id", user.id).execute()
        if res.data:
            skipped += 1
            continue
            
        data = {k: v for k, v in prod_def.items() if k not in ["images", "target_status"] and v is not None}
        data["artisan_id"] = user.id
        
        insert_res = client.table("products").insert(data).execute()
        if insert_res.data:
            product_id = insert_res.data[0]["id"]
            
            # Insert images if any
            for img in prod_def.get("images", []):
                client.table("product_images").insert({
                    "product_id": product_id,
                    "image_url": img["image_url"],
                    "is_main": img["is_main"]
                }).execute()
                
            # Seed pricing inputs based on price
            if data.get("price"):
                client.table("pricing_inputs").insert({
                    "product_id": product_id,
                    "profit_margin_percent": 20,
                    "calculated_suggested_price": data["price"]
                }).execute()
                
            # Calculate readiness score
            try:
                calculate_readiness(product_id, user.id, client)
            except Exception as e:
                print(f"Failed to calculate readiness for {data['title']}: {e}")
                
            # Publish if required
            if prod_def["target_status"] == "published":
                # Only publish if readiness >= 70, otherwise it will fail validation in real logic,
                # but we will just update directly to bypass HTTP exceptions for the script
                client.table("products").update({"status": "published"}).eq("id", product_id).execute()
                
            inserted += 1
            
    print_step(3, 5, f"Products: Inserted {inserted}, Skipped {skipped}")

def seed_workflows(admin_client):
    inserted = 0
    skipped = 0
    for workflow in WORKFLOWS:
        existing = admin_client.table("guidance_workflows").select("id").eq("workflow_key", workflow["name"]).execute()
        if existing.data:
            skipped += 1
            continue
            
        wf_data = {
            "id": workflow["id"],
            "workflow_key": workflow["name"],
            "title_en": workflow["description"],
            "target_role": workflow["target_role"],
            "is_active": workflow["is_active"]
        }
        try:
            admin_client.table("guidance_workflows").upsert(wf_data, on_conflict="id").execute()
            
            for step in workflow.get("steps", []):
                step_data = {k: v for k, v in step.items()}
                step_data["workflow_id"] = workflow["id"]
                admin_client.table("guidance_steps").insert(step_data).execute()
            inserted += 1
        except Exception as e:
            print(f"Skipping workflow {workflow['name']} due to error: {e}")
            skipped += 1
    
    print_step(4, 5, f"Guide Hand: Inserted {inserted} workflows, Skipped {skipped}")

def seed_buyer_enquiries(buyer_token_data, admin_client):
    token = buyer_token_data["token"]
    user = buyer_token_data["user"]
    client = get_authenticated_client(token)
    
    res = admin_client.table("products").select("id, title, artisan_id").eq("status", "published").execute()
    published_products = res.data or []
    
    inserted = 0
    skipped = 0
    for product in published_products:
        existing = client.table("buyer_enquiries").select("id").eq("product_id", product["id"]).eq("buyer_id", user.id).execute()
        if existing.data:
            skipped += 1
            continue
            
        client.table("buyer_enquiries").insert({
            "product_id": product["id"],
            "artisan_id": product["artisan_id"],
            "buyer_id": user.id,
            "quantity": 5 if "Saree" in product["title"] else 20,
            "budget": 120000 if "Saree" in product["title"] else 30000,
            "customisation_request": "I would like to order 5 sarees for an upcoming wedding. Can the borders be customized?" if "Saree" in product["title"] else "Need 20 pieces for a boutique.",
            "status": "new"
        }).execute()
        inserted += 1
        
    print_step(5, 5, f"Buyer Enquiries: Inserted {inserted}, Skipped {skipped}")

def seed():
    admin_client = get_service_client()
    tokens = ensure_users_exist(admin_client)
    
    if "artisan" in tokens:
        seed_artisan_profile(tokens["artisan"])
        seed_products(tokens["artisan"])
    else:
        print("Missing artisan token, skipping profile and products.")
        
    seed_workflows(admin_client)
    
    if "buyer" in tokens:
        seed_buyer_enquiries(tokens["buyer"], admin_client)
    else:
        print("Missing buyer token, skipping enquiries.")

if __name__ == "__main__":
    seed()
