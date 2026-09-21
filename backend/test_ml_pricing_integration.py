"""
Automated Integration Tests for Multimodal AI Dynamic Pricing in ArtisanX.
Tests /pricing/predict and /api/pricing/predict with:
1. Complete product payload
2. Missing/zero costs edge case (ensures sensible craft bounds)
3. Missing image graceful fallback
4. Cost floor enforcement (recommended >= cost floor)
5. Explanations content and structure
"""
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json().get("status") == "ok"

def test_ml_pricing_predict_complete():
    payload = {
        "title": "Handwoven Banarasi Silk Saree",
        "category": "Textiles & Handlooms",
        "description": "Pure katan silk with intricate gold and silver zari brocade work.",
        "craft_type": "Handloom Weaving",
        "materials": [
            {"name": "Silk Yarn", "quantity": 1.2, "unit": "kg", "cost": 1200},
            {"name": "Zari Thread", "quantity": 0.3, "unit": "spool", "cost": 600}
        ],
        "dimensions": "5.5m x 1.2m",
        "labor_hours": 40,
        "labor_rate": 75,
        "packaging_cost": 150,
        "overhead_cost": 100,
        "logistics_cost": 200,
        "profit_margin_percent": 20.0
    }
    
    # Test both /pricing/predict and /api/pricing/predict
    for endpoint in ["/pricing/predict", "/api/pricing/predict"]:
        res = client.post(endpoint, json=payload)
        assert res.status_code == 200, f"Failed on {endpoint}: {res.text}"
        data = res.json()
        assert data["success"] is True
        assert data["predicted_price"] > 0
        assert data["recommended_price"] > 0
        assert data["cost_floor"] > 0
        # Recommended price MUST be >= cost floor
        assert data["recommended_price"] >= data["cost_floor"]
        assert "low" in data["price_range"]
        assert "high" in data["price_range"]
        assert data["price_range"]["high"] >= data["price_range"]["low"]
        assert isinstance(data["explanation"], list)
        assert len(data["explanation"]) >= 3
        assert data["model"] == "Lasso Regression"
        assert data["features_used"] == 652
        print(f"\n[PASS] {endpoint}:")
        print(f"  Recommended Price: ₹{data['recommended_price']}")
        print(f"  Cost Floor: ₹{data['cost_floor']}")
        print(f"  Range: ₹{data['price_range']['low']} - ₹{data['price_range']['high']}")
        print(f"  Explanations: {data['explanation']}")

def test_ml_pricing_zero_costs_graceful():
    """Ensure zero costs are handled gracefully and don't collapse or crash."""
    payload = {
        "title": "Terracotta Flower Pot",
        "category": "Pottery & Ceramics",
        "description": "Clay flower pot handcrafted with natural terracotta.",
        "craft_type": "Wheel Pottery",
        "materials": "Terracotta Clay",
        "dimensions": "20cm x 15cm x 15cm",
        "labor_hours": 0,
        "labor_rate": 0,
        "material_cost": 0,
        "packaging_cost": 0
    }
    res = client.post("/pricing/predict", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["recommended_price"] >= 50.0
    assert len(data["explanation"]) > 0

def test_ml_pricing_multipart_without_image():
    """Test form submission without image file."""
    res = client.post(
        "/pricing/predict",
        data={
            "title": "Carved Teakwood Box",
            "category": "Woodcraft & Carving",
            "craft_type": "Wood Carving",
            "materials": "Teak Wood, Brass Hinges",
            "labor_hours": "8",
            "labor_rate": "80",
            "material_cost": "350",
            "packaging_cost": "50"
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["recommended_price"] > 0
    assert data["recommended_price"] >= data["cost_floor"]

if __name__ == "__main__":
    print("Running integration tests...")
    test_health()
    test_ml_pricing_predict_complete()
    test_ml_pricing_zero_costs_graceful()
    test_ml_pricing_multipart_without_image()
    print("\nALL BACKEND ML PRICING TESTS PASSED!")
