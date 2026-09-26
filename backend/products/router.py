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
from typing import Optional, List, Dict, Any

class ProductTranslateRequest(BaseModel):
    product_id: Optional[str] = None
    title: Optional[str] = ""
    description: Optional[str] = ""
    short_description: Optional[str] = ""
    full_description: Optional[str] = ""
    key_highlights: Optional[List[str]] = []
    craft_story: Optional[str] = ""
    care_instructions: Optional[str] = ""
    target_language: str = "hi"
    source_language: str = "en"

@router.post("/translate")
def route_translate_product(req: ProductTranslateRequest):
    if not req.target_language or req.target_language == "en":
        return {
            "title": req.title or "",
            "description": req.description or req.full_description or "",
            "short_description": req.short_description or "",
            "full_description": req.full_description or req.description or "",
            "key_highlights": req.key_highlights or [],
            "craft_story": req.craft_story or "",
            "care_instructions": req.care_instructions or ""
        }
    
    lang_names = {
        "hi": "Hindi", "ta": "Tamil", "te": "Telugu", "kn": "Kannada",
        "ml": "Malayalam", "bn": "Bengali", "mr": "Marathi", "gu": "Gujarati",
        "ur": "Urdu", "en": "English"
    }
    target_name = lang_names.get(req.target_language, req.target_language)
    
    # 1. First try Bhashini NMT (fast & accurate for Indian languages)
    try:
        from ai.bhashini_client import bhashini_client
        fields_to_trans = {
            "title": req.title or "",
            "short_description": req.short_description or req.description or "",
            "full_description": req.full_description or req.description or "",
            "key_highlights": req.key_highlights or []
        }
        bhash_res = bhashini_client.translate_catalogue_fields(
            fields_to_trans,
            source_lang="en",
            target_langs=[req.target_language]
        )
        if bhash_res and req.target_language in bhash_res:
            t_data = bhash_res[req.target_language]
            # Ensure it didn't just return untranslated source english
            if t_data.get("title") and (t_data["title"] != req.title or not req.title):
                story_trans = ""
                care_trans = ""
                if req.craft_story:
                    try:
                        story_trans = bhashini_client.translate_text(req.craft_story, source_lang="en", target_lang=req.target_language)
                    except Exception:
                        story_trans = req.craft_story
                if req.care_instructions:
                    try:
                        care_trans = bhashini_client.translate_text(req.care_instructions, source_lang="en", target_lang=req.target_language)
                    except Exception:
                        care_trans = req.care_instructions

                return {
                    "title": t_data.get("title") or req.title or "",
                    "description": t_data.get("full_description") or t_data.get("short_description") or req.description or "",
                    "short_description": t_data.get("short_description") or req.short_description or "",
                    "full_description": t_data.get("full_description") or req.full_description or req.description or "",
                    "key_highlights": t_data.get("key_highlights") or req.key_highlights or [],
                    "craft_story": story_trans or req.craft_story or "",
                    "care_instructions": care_trans or req.care_instructions or ""
                }
    except Exception as bhash_err:
        logger.warning(f"Bhashini translate route failed: {bhash_err}. Falling back to Gemini...")

    # 2. Fallback to Gemini
    try:
        from ai.gemini_client import generate_content
        import json
        
        prompt = f"""You are a professional multilingual translator for Indian handicrafts and artisan products.
Translate the following fields into {target_name} ({req.target_language}).
Keep the authentic artisan tone, natural and culturally accurate.
Return ONLY a valid JSON object with the exact keys:
{{
  "title": "translated title",
  "short_description": "translated short description",
  "full_description": "translated full description",
  "key_highlights": ["translated highlight 1", "translated highlight 2"],
  "craft_story": "translated craft story",
  "care_instructions": "translated care instructions"
}}

Inputs to translate:
- title: {req.title or ''}
- short_description: {req.short_description or ''}
- full_description: {req.full_description or req.description or ''}
- key_highlights: {json.dumps(req.key_highlights or [])}
- craft_story: {req.craft_story or ''}
- care_instructions: {req.care_instructions or ''}
"""
        res_str = generate_content(prompt, mime_type="application/json")
        data = json.loads(res_str)
        return {
            "title": data.get("title") or req.title or "",
            "description": data.get("full_description") or data.get("short_description") or data.get("description") or req.description or "",
            "short_description": data.get("short_description") or req.short_description or "",
            "full_description": data.get("full_description") or data.get("description") or req.full_description or req.description or "",
            "key_highlights": data.get("key_highlights") or req.key_highlights or [],
            "craft_story": data.get("craft_story") or req.craft_story or "",
            "care_instructions": data.get("care_instructions") or req.care_instructions or ""
        }
    except Exception as e:
        logger.error(f"Translation error for {req.target_language}: {e}")
        return {
            "title": req.title or "",
            "description": req.description or req.full_description or "",
            "short_description": req.short_description or "",
            "full_description": req.full_description or req.description or "",
            "key_highlights": req.key_highlights or [],
            "craft_story": req.craft_story or "",
            "care_instructions": req.care_instructions or ""
        }


