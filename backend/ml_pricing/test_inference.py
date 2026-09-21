import json
from ml_pricing.schemas import PriceRecommendationRequest
from ml_pricing.inference import get_pricing_inference_engine

def test_inference():
    print("Testing ML Pricing Inference Engine...")
    engine = get_pricing_inference_engine()

    # Test Case 1: Handmade Terracotta Lamp
    req = PriceRecommendationRequest(
        title="Handcrafted Terracotta Diya Lamp",
        tags=["terracotta", "lamp", "handmade", "clay"],
        category="Home Decor",
        material="Terracotta",
        description="Authentic handcrafted earthen diya lamp with floral cutwork.",
        image_url="https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=600"
    )

    resp = engine.recommend_price(req)
    print("\n--- INFERENCE RESULT FOR TERRACOTTA LAMP ---")
    print(f"Recommended Price:   INR {resp.recommended_price}")
    print(f"Estimated Range:     INR {resp.price_range.min} - INR {resp.price_range.max}")
    print(f"Confidence:          {resp.confidence * 100:.1f}% ({resp.confidence_level})")
    print(f"ML Model Prediction: INR {resp.ml_predicted_price}")
    print(f"Market Comparable:   INR {resp.comparable_market_price}")
    print(f"Explanation:         {resp.price_explanation}")
    print(f"\nTop {len(resp.top_market_prices)} Comparable Products:")
    for idx, p in enumerate(resp.top_market_prices, 1):
        print(f"  {idx}. {p.title} - INR {p.price} | Similarity: {p.similarity*100:.0f}% | Source: {p.source}")

    assert resp.recommended_price > 0, "Recommended price must be > 0"
    assert resp.price_range.min <= resp.recommended_price <= resp.price_range.max, "Recommended price should be in range"
    assert len(resp.top_market_prices) == 3, f"Expected 3 comparables, got {len(resp.top_market_prices)}"
    print("\nAll assertions passed successfully!")

if __name__ == "__main__":
    test_inference()
