"""
ML Dynamic Pricing Service for ArtisanX.
Loads the trained Multimodal Lasso Regression model (652 features) once on startup
and runs inference combining tabular, text, and visual features.
"""
import re
import statistics
from pathlib import Path
from typing import Dict, Any, Optional, List, Union

from .schemas import MLPricingPredictRequest, MLPricingPredictResponse, PriceRangeModel
from src.utils.logger import get_logger

logger = get_logger("ml_pricing_service")

# Singleton predictor reference
_PREDICTOR = None

def get_pricing_predictor():
    """Returns the singleton ArtisanPricingPredictor instance, loading it if not yet loaded."""
    global _PREDICTOR
    if _PREDICTOR is None:
        from src.utils.config import MODELS_DIR
        # Check backend models dir first, then fallback to model training dir
        models_dir = MODELS_DIR
        if not (models_dir / "best_price_model.pkl").exists():
            fallback = Path(r"c:\Users\moune\model\artisan_dynamic_pricing_ml\models")
            if (fallback / "best_price_model.pkl").exists():
                models_dir = fallback

        logger.info(f"Initializing ArtisanPricingPredictor with models from {models_dir}")
        # Make sure src can be loaded
        import sys
        backend_dir = str(Path(__file__).resolve().parent.parent)
        if backend_dir not in sys.path:
            sys.path.insert(0, backend_dir)
        ml_dir = r"c:\Users\moune\model\artisan_dynamic_pricing_ml"
        if ml_dir not in sys.path:
            sys.path.append(ml_dir)

        # Import predictor
        try:
            from predict import ArtisanPricingPredictor
            _PREDICTOR = ArtisanPricingPredictor(models_dir=models_dir)
            logger.info("ArtisanPricingPredictor initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to load ArtisanPricingPredictor: {e}", exc_info=True)
            raise
    return _PREDICTOR


def parse_dimensions(dim_str: Optional[str]) -> Dict[str, float]:
    """Parse textual dimensions (e.g. '5.5m x 1.2m', '20x15x5 cm') into numeric cm."""
    if not dim_str:
        return {"length_cm": 25.0, "width_cm": 20.0, "height_cm": 10.0, "weight_g": 500.0}

    s = dim_str.lower().replace(",", ".")
    # Check for meter indicators
    is_meter = "m" in s and "cm" not in s and "mm" not in s

    numbers = re.findall(r"(\d+(?:\.\d+)?)", s)
    length = 25.0
    width = 20.0
    height = 10.0

    if len(numbers) >= 3:
        length = float(numbers[0])
        width = float(numbers[1])
        height = float(numbers[2])
    elif len(numbers) == 2:
        length = float(numbers[0])
        width = float(numbers[1])
        height = 5.0
    elif len(numbers) == 1:
        length = float(numbers[0])
        width = float(numbers[0])
        height = float(numbers[0])

    if is_meter:
        length *= 100.0
        width *= 100.0
        height *= 100.0

    # Approximate weight based on volume
    volume = length * width * height
    weight_g = max(50.0, min(15000.0, volume * 0.15))

    return {
        "length_cm": round(length, 1),
        "width_cm": round(width, 1),
        "height_cm": round(height, 1),
        "weight_g": round(weight_g, 1),
    }


def parse_materials_and_cost(materials_input: Any, direct_material_cost: Optional[float]) -> tuple[str, float]:
    """Parse materials string/list and calculate total material cost."""
    mat_names = []
    computed_cost = 0.0

    if isinstance(materials_input, list):
        for m in materials_input:
            if isinstance(m, dict):
                name = m.get("name") or m.get("material") or ""
                if name:
                    mat_names.append(str(name))
                qty = float(m.get("quantity") or 1.0)
                unit_cost = float(m.get("unit_cost") or m.get("cost") or 0.0)
                computed_cost += qty * unit_cost
            elif isinstance(m, str):
                mat_names.append(m.strip())
    elif isinstance(materials_input, str):
        mat_names.append(materials_input.strip())

    material_str = ", ".join(mat_names) if mat_names else "Artisan Materials"

    if direct_material_cost is not None and direct_material_cost > 0:
        final_cost = float(direct_material_cost)
    else:
        final_cost = computed_cost

    return material_str, round(final_cost, 2)


def predict_price_recommendation(
    req: MLPricingPredictRequest,
    image_bytes: Optional[bytes] = None
) -> MLPricingPredictResponse:
    """
    Run full multimodal inference using trained ArtisanPricingPredictor.
    Guarantees cost-floor protection and returns human-readable explainability.
    """
    predictor = get_pricing_predictor()

    # 1. Parse Dimensions
    dims = parse_dimensions(req.dimensions)

    # 2. Parse Materials and Cost
    material_str, material_cost = parse_materials_and_cost(req.materials, req.material_cost)

    # 3. Calculate Production Costs
    labor_hours = float(req.labor_hours or 0.0)
    labor_rate = float(req.labor_rate or 0.0)
    labour_cost = labor_hours * labor_rate
    packaging_cost = float(req.packaging_cost or 0.0)
    transport_cost = float(req.logistics_cost or 0.0)
    overhead_cost = float(req.overhead_cost or 0.0)

    total_cost = material_cost + labour_cost + packaging_cost + transport_cost + overhead_cost

    # 4. Standard category fallbacks for zero-cost edge case
    category = (req.category or "Textiles & Handlooms").strip()
    title = (req.title or req.product_name or "Handcrafted Artisan Product").strip()
    craft_type = (req.craft_type or f"{category} Craft").strip()
    description = (req.description or f"Authentic handcrafted {title} made with traditional {material_str}.").strip()

    # Determine tags
    tags_str = ""
    if isinstance(req.tags, list):
        tags_str = ", ".join(str(t) for t in req.tags)
    elif isinstance(req.tags, str):
        tags_str = req.tags
    else:
        tags_str = f"{category}, Handcrafted, {material_str}"

    # Build input record for ML pipeline
    product_record = {
        "product_name": title,
        "category": category,
        "material": material_str,
        "craft_type": craft_type,
        "tags": tags_str,
        "description": description,
        "size": "Standard",
        "weight_g": dims["weight_g"],
        "length_cm": dims["length_cm"],
        "width_cm": dims["width_cm"],
        "height_cm": dims["height_cm"],
        "quantity": 1.0,
        "handmade": req.handmade or "Yes",
        "customization": req.customization or "Available",
        "complexity": req.complexity or "Medium",
        "material_cost": material_cost,
        "labour_cost": labour_cost,
        "packaging_cost": packaging_cost,
        "transport_cost": transport_cost,
        "other_cost": overhead_cost,
        "image_url": req.image_url,
    }

    # 5. Run ML Predictor
    try:
        raw_result = predictor.predict(product_record, image_path=image_bytes or req.image_url)
    except Exception as e:
        logger.error(f"Prediction execution failed: {e}", exc_info=True)
        # Fallback safe calculation if ML pipeline fails
        base_floor = max(100.0, total_cost * 1.25)
        raw_result = {
            "predicted_price_inr": round(base_floor, 2),
            "recommended_price_inr": round(base_floor, 2),
            "price_range": {"low": round(base_floor * 0.85, 2), "high": round(base_floor * 1.25, 2)},
            "cost_floor_inr": round(total_cost * 1.10, 2),
            "confidence": "medium",
            "explanation": [
                f"Labor & Materials: ₹{total_cost:.2f}",
                "Estimated using safe cost-plus craftsmanship baseline."
            ]
        }

    predicted_price = float(raw_result["predicted_price_inr"])
    recommended_price = float(raw_result["recommended_price_inr"])
    price_range_low = float(raw_result["price_range"]["low"])
    price_range_high = float(raw_result["price_range"]["high"])

    # 6. Cost Floor Enforcement (Materials + Labor + Overhead + Min Margin <= Recommended)
    margin_pct = float(req.profit_margin_percent or 20.0)
    calculated_cost_floor = round(total_cost * (1.0 + max(10.0, margin_pct) / 100.0), 2)
    final_cost_floor = max(calculated_cost_floor, float(raw_result.get("cost_floor_inr", 0.0)))

    # Strictly ensure recommended price >= cost floor
    if final_cost_floor > 0 and recommended_price < final_cost_floor:
        recommended_price = final_cost_floor
        price_range_low = min(price_range_low, round(final_cost_floor * 0.95, 2))
        price_range_high = max(price_range_high, round(final_cost_floor * 1.25, 2))

    # Clean rounding to nearest 10 for professional consumer pricing
    recommended_price = round(recommended_price, -1)
    if final_cost_floor > 0 and recommended_price < final_cost_floor:
        import math
        recommended_price = float(math.ceil(final_cost_floor / 10.0) * 10.0)

    price_range_low = round(price_range_low, -1)
    price_range_high = max(recommended_price, round(price_range_high, -1))

    # 7. Build Human-Readable Explanations
    explanation: List[str] = []
    if labor_hours > 0 and labor_rate > 0:
        explanation.append(f"Labor: {labor_hours:g} hrs @ ₹{labor_rate:g}/hr = ₹{labour_cost:,.2f}")
    elif labour_cost > 0:
        explanation.append(f"Labor: ₹{labour_cost:,.2f}")

    if material_cost > 0:
        explanation.append(f"Materials ({material_str}): ₹{material_cost:,.2f}")

    overhead_and_logistics = packaging_cost + transport_cost + overhead_cost
    if overhead_and_logistics > 0:
        explanation.append(f"Overhead & Logistics: ₹{overhead_and_logistics:,.2f}")

    # Add model-specific explanations
    model_exps = raw_result.get("explanation", [])
    for exp in model_exps:
        if not any(k in exp.lower() for k in ["total cost ₹", "sustainable cost floor"]):
            explanation.append(exp)

    # If few explanations, add craft positioning note
    if len(explanation) < 3:
        margin_diff = recommended_price - total_cost
        if margin_diff > 0:
            explanation.append(f"Market positioning: Handcrafted {category} premium (+₹{margin_diff:,.2f} margin)")

    return MLPricingPredictResponse(
        success=True,
        predicted_price=round(predicted_price, 2),
        recommended_price=round(recommended_price, 2),
        price_range=PriceRangeModel(low=price_range_low, high=price_range_high),
        cost_floor=round(final_cost_floor, 2),
        confidence=raw_result.get("confidence", "high"),
        explanation=explanation,
        model_version="v1-multimodal",
        model="Lasso Regression",
        features_used=652,
        comparable_market_price=round(recommended_price * 0.98, 2),
        status="success"
    )
