from fastapi import APIRouter, Depends, UploadFile, File, Form, Query
from typing import Any, Optional
from . import schemas
from . import service
from auth.dependencies import get_current_user, get_token

router = APIRouter(prefix="/images", tags=["images"])

@router.post("/upload", response_model=schemas.ImageUploadResponse)
def route_upload_image(
    product_id: Optional[str] = Form(None),
    is_main: bool = Form(False),
    file: UploadFile = File(...),
    current_user: Any = Depends(get_current_user),
    token: str = Depends(get_token)
):
    return service.upload_image(file, current_user["id"], token, product_id, is_main)

@router.post("/enhance/{image_id}", response_model=schemas.ImageUploadResponse)
def route_enhance_image(
    image_id: str, 
    background_type: str = Query("studio"),
    brightness: float = Query(0.0),
    contrast: float = Query(0.0),
    rotate: int = Query(0),
    add_shadow: bool = Query(True),
    use_rembg: bool = Query(True),
    current_user: Any = Depends(get_current_user),
    token: str = Depends(get_token)
):
    return service.enhance_image(
        image_id=image_id,
        artisan_id=current_user["id"],
        token=token,
        background_type=background_type,
        brightness=brightness,
        contrast=contrast,
        rotate=rotate,
        add_shadow=add_shadow,
        use_rembg=use_rembg
    )

@router.post("/quality-check/{image_id}", response_model=schemas.ImageQualityCheck)
def route_check_quality(image_id: str, current_user: Any = Depends(get_current_user), token: str = Depends(get_token)):
    return service.check_quality(image_id, current_user["id"], token)

@router.get("/product/{product_id}")
def route_get_product_images(product_id: str, current_user: Any = Depends(get_current_user), token: str = Depends(get_token)):
    from database import get_authenticated_client
    auth_client = get_authenticated_client(token)
    res = auth_client.table("product_images").select("*").eq("product_id", product_id).execute()
    return res.data or []

@router.delete("/{image_id}")
def route_delete_image(image_id: str, current_user: Any = Depends(get_current_user), token: str = Depends(get_token)):
    return service.delete_image(image_id, current_user["id"], token)

@router.patch("/{image_id}/use-enhanced", response_model=schemas.ImageUploadResponse)
def route_use_enhanced(
    image_id: str,
    use_enhanced: bool = Query(...),
    current_user: Any = Depends(get_current_user),
    token: str = Depends(get_token)
):
    return service.toggle_enhanced_quality(image_id, use_enhanced, current_user["id"], token)
