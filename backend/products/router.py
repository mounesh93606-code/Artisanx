from fastapi import APIRouter, Depends, HTTPException
from typing import Any, List
from . import schemas
from . import service
from auth.dependencies import get_current_user, security
from database import get_authenticated_client
from fastapi.security import HTTPAuthorizationCredentials

router = APIRouter(prefix="/products", tags=["products"])

@router.post("/", response_model=schemas.ProductResponse)
def route_create_product(product: schemas.ProductCreate, current_user: Any = Depends(get_current_user), token: HTTPAuthorizationCredentials = Depends(security)):
    auth_client = get_authenticated_client(token.credentials)
    return service.create_product(product, current_user["id"], auth_client)

@router.get("/my", response_model=List[schemas.ProductResponse])
def route_get_my_products(status: str = None, search: str = None, current_user: Any = Depends(get_current_user), token: HTTPAuthorizationCredentials = Depends(security)):
    auth_client = get_authenticated_client(token.credentials)
    return service.get_my_products(current_user["id"], auth_client, status, search)

@router.get("/{product_id}", response_model=schemas.ProductResponse)
def route_get_product(product_id: str, current_user: Any = Depends(get_current_user), token: HTTPAuthorizationCredentials = Depends(security)):
    auth_client = get_authenticated_client(token.credentials)
    return service.get_product(product_id, current_user["id"], auth_client)

@router.put("/{product_id}", response_model=schemas.ProductResponse)
def route_update_product(product_id: str, product: schemas.ProductUpdate, current_user: Any = Depends(get_current_user), token: HTTPAuthorizationCredentials = Depends(security)):
    auth_client = get_authenticated_client(token.credentials)
    return service.update_product(product_id, product, current_user["id"], auth_client)

@router.delete("/{product_id}", response_model=schemas.ProductResponse)
def route_delete_product(product_id: str, current_user: Any = Depends(get_current_user), token: HTTPAuthorizationCredentials = Depends(security)):
    auth_client = get_authenticated_client(token.credentials)
    return service.delete_product(product_id, current_user["id"], auth_client)

@router.put("/{product_id}/unpublish", response_model=schemas.ProductResponse)
def route_unpublish_product(product_id: str, current_user: Any = Depends(get_current_user), token: HTTPAuthorizationCredentials = Depends(security)):
    auth_client = get_authenticated_client(token.credentials)
    return service.unpublish_product(product_id, current_user["id"], auth_client)

@router.get("/{product_id}/readiness", response_model=schemas.ReadinessResponse)
def route_get_readiness(product_id: str, current_user: Any = Depends(get_current_user), token: HTTPAuthorizationCredentials = Depends(security)):
    auth_client = get_authenticated_client(token.credentials)
    return service.calculate_readiness(product_id, current_user["id"], auth_client)

@router.post("/{product_id}/publish")
def route_publish_product(product_id: str, current_user: Any = Depends(get_current_user), token: HTTPAuthorizationCredentials = Depends(security)):
    auth_client = get_authenticated_client(token.credentials)
    return service.publish_product(product_id, current_user["id"], auth_client)

@router.get("/catalogue/list", response_model=schemas.CatalogueResponse)
def route_get_catalogue(
    search: str = None,
    category: str = None,
    craft_type: str = None,
    min_price: float = None,
    max_price: float = None,
    location: str = None,
    state: str = None,
    material: str = None,
    max_moq: int = None,
    max_lead_time: int = None,
    in_stock: bool = None,
    made_to_order: bool = None,
    sort_by: str = "newest",
    page: int = 1,
    per_page: int = 20
):
    return service.get_catalogue(search, category, craft_type, min_price, max_price, location, state, material, max_moq, max_lead_time, in_stock, made_to_order, sort_by, page, per_page)

@router.get("/catalogue/detail/{product_id}", response_model=schemas.CatalogueDetailResponse)
def route_get_catalogue_detail(product_id: str):
    return service.get_catalogue_detail(product_id)

@router.get("/variants/{product_id}")
def route_get_variants(product_id: str, current_user: Any = Depends(get_current_user), token: HTTPAuthorizationCredentials = Depends(security)):
    auth_client = get_authenticated_client(token.credentials)
    res = auth_client.table("product_variants").select("*").eq("product_id", product_id).execute()
    return {"variants": res.data}

@router.put("/variants/{product_id}")
def route_save_variants(product_id: str, payload: dict, current_user: Any = Depends(get_current_user), token: HTTPAuthorizationCredentials = Depends(security)):
    auth_client = get_authenticated_client(token.credentials)
    # verify ownership
    service.get_product(product_id, current_user["id"], auth_client)
    
    # Delete existing
    auth_client.table("product_variants").delete().eq("product_id", product_id).execute()
    
    # Insert new
    variants = payload.get("variants", [])
    if variants:
        for v in variants:
            v["product_id"] = product_id
            if "is_new" in v:
                del v["is_new"]
            if "id" in v and str(v["id"]).startswith("temp_"):
                del v["id"]
                
        auth_client.table("product_variants").insert(variants).execute()
        
    return {"status": "success"}

@router.delete("/variants/{variant_id}")
def route_delete_variant(variant_id: str, current_user: Any = Depends(get_current_user), token: HTTPAuthorizationCredentials = Depends(security)):
    auth_client = get_authenticated_client(token.credentials)
    auth_client.table("product_variants").delete().eq("id", variant_id).execute()
    return {"status": "success"}

@router.post("/{product_id}/duplicate")
def route_duplicate_product(product_id: str, current_user: Any = Depends(get_current_user), token: HTTPAuthorizationCredentials = Depends(security)):
    auth_client = get_authenticated_client(token.credentials)
    product = service.get_product(product_id, current_user["id"], auth_client)
    
    # Remove metadata
    del product["id"]
    del product["created_at"]
    if "updated_at" in product:
        del product["updated_at"]
    
    product["title"] = f"Copy of {product.get('title', 'Product')}"
    product["status"] = "draft"
    
    # Insert new product
    res = auth_client.table("products").insert(product).execute()
    new_id = res.data[0]["id"]
    
    # Duplicate images
    img_res = auth_client.table("product_images").select("*").eq("product_id", product_id).execute()
    if img_res.data:
        imgs = img_res.data
        for img in imgs:
            del img["id"]
            del img["created_at"]
            img["product_id"] = new_id
        auth_client.table("product_images").insert(imgs).execute()
        
    # Duplicate variants
    var_res = auth_client.table("product_variants").select("*").eq("product_id", product_id).execute()
    if var_res.data:
        vars = var_res.data
        for v in vars:
            del v["id"]
            del v["created_at"]
            v["product_id"] = new_id
    return {"status": "success", "new_product_id": new_id}

from pydantic import BaseModel
from typing import Optional

class ProductTranslateRequest(BaseModel):
    product_id: Optional[str] = None
    title: Optional[str] = ""
    description: Optional[str] = ""
    craft_story: Optional[str] = ""
    care_instructions: Optional[str] = ""
    target_language: str = "hi"
    source_language: str = "en"

@router.post("/translate")
def route_translate_product(req: ProductTranslateRequest):
    if not req.target_language or req.target_language == "en":
        return {
            "title": req.title or "",
            "description": req.description or "",
            "craft_story": req.craft_story or "",
            "care_instructions": req.care_instructions or ""
        }
    
    lang_names = {
        "hi": "Hindi", "ta": "Tamil", "te": "Telugu", "kn": "Kannada",
        "ml": "Malayalam", "bn": "Bengali", "mr": "Marathi", "ur": "Urdu", "en": "English"
    }
    target_name = lang_names.get(req.target_language, req.target_language)
    
    try:
        from ai.gemini_client import generate_content
        import json
        
        prompt = f"""You are a professional multilingual translator for Indian handicrafts and artisan products.
Translate the following fields into {target_name} ({req.target_language}).
Keep the authentic artisan tone, natural and culturally accurate.
Return ONLY a valid JSON object with the exact keys:
{{
  "title": "translated title",
  "description": "translated description",
  "craft_story": "translated craft story",
  "care_instructions": "translated care instructions"
}}

Inputs to translate:
- title: {req.title or ''}
- description: {req.description or ''}
- craft_story: {req.craft_story or ''}
- care_instructions: {req.care_instructions or ''}
"""
        res_str = generate_content(prompt, mime_type="application/json")
        data = json.loads(res_str)
        return {
            "title": data.get("title") or req.title or "",
            "description": data.get("description") or req.description or "",
            "craft_story": data.get("craft_story") or req.craft_story or "",
            "care_instructions": data.get("care_instructions") or req.care_instructions or ""
        }
    except Exception as e:
        print(f"Translation error for {req.target_language}: {e}")
        return {
            "title": req.title or "",
            "description": req.description or "",
            "craft_story": req.craft_story or "",
            "care_instructions": req.care_instructions or ""
        }

