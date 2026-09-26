from fastapi import APIRouter, Depends, HTTPException
from typing import Any, List
from auth.dependencies import get_current_user, security
from database import get_authenticated_client
from fastapi.security import HTTPAuthorizationCredentials
from . import schemas

router = APIRouter(prefix="/buyer", tags=["buyer"])

@router.get("/wishlist")
def get_wishlist(current_user: Any = Depends(get_current_user), token: HTTPAuthorizationCredentials = Depends(security)):
    auth_client = get_authenticated_client(token.credentials)
    # Fetch wishlist
    # Need to join with products to get product details, images
    res = auth_client.table("saved_products").select(
        "id, product_id, created_at, products(id, title, price, status, product_images(image_url, is_main))"
    ).eq("buyer_id", current_user["id"]).execute()
    
    # Format the response
    items = []
    for item in res.data:
        product = item.get("products", {})
        if not product or product.get("status") != "published":
            continue
            
        images = product.get("product_images", [])
        main_image = None
        for img in images:
            if img.get("is_main"):
                main_image = img.get("image_url")
                break
        if not main_image and images:
            main_image = images[0].get("image_url")
            
        items.append({
            "id": product.get("id"),
            "title": product.get("title"),
            "price": product.get("price"),
            "status": product.get("status"),
            "image_url": main_image,
            "saved_at": item.get("created_at")
        })
        
    return {"items": items}

@router.post("/wishlist")
def add_to_wishlist(payload: schemas.WishlistItem, current_user: Any = Depends(get_current_user), token: HTTPAuthorizationCredentials = Depends(security)):
    auth_client = get_authenticated_client(token.credentials)
    try:
        auth_client.table("saved_products").insert({
            "buyer_id": current_user["id"],
            "product_id": payload.product_id
        }).execute()
        return {"status": "success"}
    except Exception as e:
        # Ignore if already exists (Unique constraint violation)
        return {"status": "success", "note": "Already exists or error"}

@router.delete("/wishlist/{product_id}")
def remove_from_wishlist(product_id: str, current_user: Any = Depends(get_current_user), token: HTTPAuthorizationCredentials = Depends(security)):
    auth_client = get_authenticated_client(token.credentials)
    auth_client.table("saved_products").delete().eq("buyer_id", current_user["id"]).eq("product_id", product_id).execute()
    return {"status": "success"}
