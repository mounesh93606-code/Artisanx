import json
from typing import Optional, List
from fastapi import APIRouter, File, UploadFile, Form, Depends, Body
from pydantic import ValidationError

from .schemas import (
    PriceRecommendationRequest,
    PriceRecommendationResponse
)
from .inference import get_pricing_inference_engine

router = APIRouter(prefix="/ml", tags=["ml_pricing"])

@router.post("/price-recommendation", response_model=PriceRecommendationResponse)
async def get_price_recommendation(
    # Option A: JSON Body
    req: Optional[PriceRecommendationRequest] = Body(None),
    # Option B: Multipart Form (for direct image file uploads)
    image: Optional[UploadFile] = File(None),
    title: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    material: Optional[str] = Form(None),
    craft_type: Optional[str] = Form(None),
    dimensions: Optional[str] = Form(None),
    image_url: Optional[str] = Form(None),
    product_id: Optional[str] = Form(None)
):
    engine = get_pricing_inference_engine()

    # If JSON body was provided
    if req is not None and (req.title or req.category or req.image_url or req.description):
        return engine.recommend_price(req)

    # Parse tags from form if string
    tag_list: List[str] = []
    if tags:
        try:
            parsed = json.loads(tags)
            if isinstance(parsed, list):
                tag_list = [str(t) for t in parsed]
            else:
                tag_list = [str(tags)]
        except Exception:
            tag_list = [t.strip() for t in tags.split(",") if t.strip()]

    # If image file uploaded directly
    image_bytes = None
    if image is not None:
        try:
            image_bytes = await image.read()
        except Exception as e:
            print(f"Error reading uploaded image: {e}")

    request_obj = PriceRecommendationRequest(
        title=title,
        category=category,
        tags=tag_list,
        description=description,
        material=material,
        craft_type=craft_type,
        dimensions=dimensions,
        image_url=image_url,
        product_id=product_id
    )

    # If image bytes were uploaded, pass them into query
    if image_bytes:
        query_dict = request_obj.model_dump()
        query_dict["image_bytes"] = image_bytes
        # Also run recommendation directly
        ml_price = engine.predictor.predict(query_dict)
        top_comparables = engine.similarity_engine.find_top_comparables(query_dict, top_k=3)
        
        # Format response
        import statistics
        from .config import WEIGHT_SIMILARITY_MARKET, WEIGHT_ML_PREDICTION, MODEL_VERSION
        from .schemas import ComparableProduct, PriceRange
        
        top_market_prices = [ComparableProduct(**c) for c in top_comparables]
        if top_market_prices:
            comp_prices = [p.price for p in top_market_prices]
            comp_median = float(statistics.median(comp_prices))
            recommended = (WEIGHT_SIMILARITY_MARKET * comp_median) + (WEIGHT_ML_PREDICTION * ml_price)
            recommended_price = round(recommended, -1)
            range_min = round(min(min(comp_prices) * 0.95, recommended_price * 0.88), -1)
            range_max = round(max(max(comp_prices) * 1.05, recommended_price * 1.12), -1)
            avg_sim = float(statistics.mean([p.similarity for p in top_market_prices]))
            confidence = round(min(0.95, avg_sim), 2)
            confidence_level = "high" if confidence >= 0.80 else "medium"
            explanation = (
                f"Price recommendation is based on product-image similarity, product tags, "
                f"category, and {len(top_market_prices)} recent comparable market listings."
            )
            status = "success"
        else:
            comp_median = None
            recommended_price = round(ml_price, -1)
            range_min = round(recommended_price * 0.85, -1)
            range_max = round(recommended_price * 1.15, -1)
            confidence = 0.55
            confidence_level = "low"
            explanation = "Limited direct market data available. Recommendation is estimated using the ML model."
            status = "limited_data"

        return PriceRecommendationResponse(
            recommended_price=float(recommended_price),
            currency="INR",
            price_range=PriceRange(min=float(range_min), max=float(range_max)),
            confidence=confidence,
            confidence_level=confidence_level,
            data_quality="high" if status == "success" else "limited",
            price_explanation=explanation,
            ml_predicted_price=float(ml_price),
            comparable_market_price=comp_median,
            top_market_prices=top_market_prices,
            model_version=MODEL_VERSION,
            status=status
        )

    return engine.recommend_price(request_obj)
