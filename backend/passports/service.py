import qrcode
import io
import os
from fastapi import HTTPException
from database import get_supabase_client
from .schemas import PassportGenerateResponse, PassportData, ProductImage
from typing import Any
from config import settings

FRONTEND_URL = getattr(settings, "FRONTEND_URL", None) or os.environ.get("FRONTEND_URL", "http://localhost:5173")

def generate_passport(product_id: str, auth_client: Any, user_id: str) -> PassportGenerateResponse:
    prod_res = auth_client.table("products").select("*").eq("id", product_id).execute()
    if not prod_res.data:
        raise HTTPException(status_code=404, detail="Product not found or access denied")
        
    product = prod_res.data[0]
    artisan_id = product.get("artisan_id")
    if artisan_id != user_id:
        raise HTTPException(status_code=403, detail="You do not own this product")
    
    profile_res = auth_client.table("artisan_profiles").select("*").eq("user_id", artisan_id).execute()
    profile = profile_res.data[0] if profile_res.data else {}
    
    images_res = auth_client.table("product_images").select("*").eq("product_id", product_id).execute()
    images = images_res.data if images_res.data else []
    
    materials_raw = product.get("materials")
    clean_mats = materials_raw
    if materials_raw and isinstance(materials_raw, dict) and "list" in materials_raw:
        clean_mats = {"list": [{"name": m.get("name")} for m in materials_raw["list"] if isinstance(m, dict)]}
        
    passport_data = PassportData(
        title=product.get("title") or "",
        images=[ProductImage(image_url=img["image_url"], is_main=img.get("is_main", False)) for img in images],
        artisan_name=profile.get("artisan_name") or "",
        artisan_story=profile.get("craft_story"),
        craft_location=profile.get("location"),
        materials=clean_mats,
        care_instructions=product.get("care_instructions"),
        price=float(product.get("price") or 0.0),
        moq=product.get("moq"),
        lead_time=product.get("lead_time_days"),
        stock=product.get("stock_quantity"),
        customisation_available=product.get("customisation_available", False),
        verification_status=profile.get("verification_status")
    )
    
    qr_url = f"{FRONTEND_URL}/product/{product_id}"
    qr = qrcode.make(qr_url)
    img_byte_arr = io.BytesIO()
    qr.save(img_byte_arr, format='PNG')
    img_bytes = img_byte_arr.getvalue()
    
    qr_filename = f"{product_id}.png"
    try:
        auth_client.storage.from_("qr-codes").upload(qr_filename, img_bytes, file_options={"content-type": "image/png", "upsert": "true"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload QR code: {str(e)}")
        
    qr_code_url = auth_client.storage.from_("qr-codes").get_public_url(qr_filename)
    
    passport_record = {
        "product_id": product_id,
        "qr_code_url": qr_code_url,
        "shareable_url": qr_url,
        "passport_data": passport_data.model_dump()
    }
    
    existing = auth_client.table("product_passports").select("id").eq("product_id", product_id).execute()
    if existing.data:
        auth_client.table("product_passports").update(passport_record).eq("product_id", product_id).execute()
    else:
        auth_client.table("product_passports").insert(passport_record).execute()
        
    return PassportGenerateResponse(
        passport_data=passport_data,
        qr_code_url=qr_code_url,
        shareable_url=qr_url
    )

def get_passport(product_id: str) -> dict:
    client = get_supabase_client()
    try:
        res = client.table("product_passports").select("*").eq("product_id", product_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Passport not found")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Passport not found or unavailable")
