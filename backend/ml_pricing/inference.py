import statistics
from typing import Dict, Any, List, Optional
from .config import WEIGHT_SIMILARITY_MARKET, WEIGHT_ML_PREDICTION, MODEL_VERSION
from .schemas import (
    PriceRecommendationRequest,
    PriceRecommendationResponse,
    PriceRange,
    ComparableProduct
)
from .price_predictor import PricePredictor
from .similarity_engine import SimilarityEngine

class PricingInferenceEngine:
    def __init__(self):
        self.predictor = PricePredictor()
        self.similarity_engine = SimilarityEngine()

    def recommend_price(self, req: PriceRecommendationRequest) -> PriceRecommendationResponse:
        # 1. Format query dict
        query: Dict[str, Any] = {
            "title": req.title or "",
            "tags": ", ".join(req.tags) if req.tags else "",
            "category": req.category or "",
            "description": req.description or "",
            "material": req.material or "",
            "craft_type": req.craft_type or "",
            "dimensions": req.dimensions or "",
            "image_url": req.image_url
        }

        # 2. ML Model Prediction
        ml_price = self.predictor.predict(query)

        # 3. Top 3 Comparable Products Retrieval from Cleaned Dataset
        top_comparables_raw = self.similarity_engine.find_top_comparables(query, top_k=3, min_similarity=0.20)
        
        top_market_prices: List[ComparableProduct] = []
        for c in top_comparables_raw:
            top_market_prices.append(ComparableProduct(**c))

        # 4. Hybrid Price Calculation
        if len(top_market_prices) >= 1:
            comp_prices = [p.price for p in top_market_prices]
            comp_median = float(statistics.median(comp_prices))
            
            # Weighted combination of comparable market median and ML regression prediction
            recommended = (WEIGHT_SIMILARITY_MARKET * comp_median) + (WEIGHT_ML_PREDICTION * ml_price)
            recommended_price = round(recommended, -1) # round to nearest 10 for clean retail pricing

            # Price Range calculation
            min_comp = min(comp_prices)
            max_comp = max(comp_prices)
            range_min = round(min(min_comp * 0.95, recommended_price * 0.88), -1)
            range_max = round(max(max_comp * 1.05, recommended_price * 1.12), -1)

            # Confidence based on top similarity score and sample count
            avg_sim = float(statistics.mean([p.similarity for p in top_market_prices]))
            if len(top_market_prices) >= 3 and avg_sim >= 0.80:
                confidence = round(min(0.95, avg_sim), 2)
                confidence_level = "high"
                data_quality = "high"
                status = "success"
            else:
                confidence = round(min(0.79, max(0.60, avg_sim)), 2)
                confidence_level = "medium"
                data_quality = "medium"
                status = "success"

            explanation = (
                f"Price recommendation is based on product-image similarity, product tags, "
                f"category, and {len(top_market_prices)} recent comparable market listings."
            )
        else:
            # Limited market data case
            comp_median = None
            recommended_price = round(ml_price, -1)
            range_min = round(recommended_price * 0.85, -1)
            range_max = round(recommended_price * 1.15, -1)
            confidence = 0.55
            confidence_level = "low"
            data_quality = "limited"
            status = "limited_data"
            explanation = (
                "Limited direct market data available. Recommendation is estimated from "
                "broader craft category and materials using the ML model."
            )

        return PriceRecommendationResponse(
            recommended_price=float(recommended_price),
            currency="INR",
            price_range=PriceRange(min=float(range_min), max=float(range_max)),
            confidence=confidence,
            confidence_level=confidence_level,
            data_quality=data_quality,
            price_explanation=explanation,
            ml_predicted_price=float(ml_price),
            comparable_market_price=comp_median,
            top_market_prices=top_market_prices,
            model_version=MODEL_VERSION,
            status=status
        )

_inference_engine: Optional[PricingInferenceEngine] = None

def get_pricing_inference_engine() -> PricingInferenceEngine:
    global _inference_engine
    if _inference_engine is None:
        _inference_engine = PricingInferenceEngine()
    return _inference_engine
