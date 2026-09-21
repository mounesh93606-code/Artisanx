from fastapi import APIRouter, Depends
from typing import Any
from . import schemas
from . import service
from auth.dependencies import get_current_user

router = APIRouter(prefix="/ai", tags=["ai_catalogue"])

@router.post("/generate-catalogue", response_model=schemas.CatalogueGenerateResponse)
def route_generate_catalogue(req: schemas.CatalogueGenerateRequest, current_user: Any = Depends(get_current_user)):
    return service.generate_catalogue(
        transcript=req.transcript,
        category=req.category or "",
        language=req.language or "en",
        source_language=req.source_language or req.language or "en",
        target_languages=req.target_languages
    )

@router.post("/generate-catalogue/{product_id}")
def route_save_catalogue(product_id: str, req: schemas.CatalogueSaveRequest, current_user: Any = Depends(get_current_user)):
    return service.save_catalogue(product_id, current_user["id"], req)
