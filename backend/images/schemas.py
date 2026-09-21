from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class ImageQualityBreakdown(BaseModel):
    sharpness: int
    lighting: int
    contrast: int
    resolution: int
    framing: int
    background: int

class ImageUploadResponse(BaseModel):
    id: str
    product_id: Optional[str] = None
    image_url: str
    original_url: Optional[str] = None
    enhanced_url: Optional[str] = None
    quality_score: Optional[float] = None
    is_main: bool = False
    enhanced_quality: bool = False
    enhanced_quality_score: Optional[float] = None
    suggestions: Optional[List[str]] = None
    background_type: Optional[str] = "studio"
    overall_score_100: Optional[int] = None
    quality_breakdown: Optional[Dict[str, int]] = None
    actionable_feedback: Optional[List[str]] = None

class ImageQualityCheck(BaseModel):
    blur_score: float
    brightness_score: float
    contrast_score: float
    overall_score: float
    suggestions: List[str]
    overall_score_100: Optional[int] = None
    quality_breakdown: Optional[Dict[str, int]] = None
    actionable_feedback: Optional[List[str]] = None

class EnhanceOptions(BaseModel):
    background_type: Optional[str] = "studio"  # "pure_white" | "studio" | "warm" | "transparent" | "original"
    brightness: Optional[float] = 0.0          # -1.0 to 1.0
    contrast: Optional[float] = 0.0            # -1.0 to 1.0
    rotate: Optional[int] = 0                  # 0, 90, 180, 270
    add_shadow: Optional[bool] = True
