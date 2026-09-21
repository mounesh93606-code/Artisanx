"""
Pricing Recommendation Engine.
Blends ML predictions with production cost floors, artisan minimum margins,
and competitive market positioning to produce actionable commercial pricing advice.
"""
from typing import Any
import numpy as np


class PricingRecommendationEngine:
    """Computes recommended selling price, cost floors, and competitive brackets."""

    def __init__(self, min_artisan_margin: float = 0.18, target_markup_multiplier: float = 1.0):
        """
        min_artisan_margin: Minimum sustainable margin over total production cost (default 18%).
        target_markup_multiplier: Configurable calibration multiplier (default 1.0 = direct model output).
        """
        self.min_artisan_margin = min_artisan_margin
        self.target_markup_multiplier = target_markup_multiplier

    def compute_cost_floor(self, total_cost: float) -> float:
        """
        Absolute minimum selling price below which the artisan operates at an economic loss.
        cost_floor = total_cost * (1 + min_artisan_margin)
        """
        return round(float(total_cost) * (1.0 + self.min_artisan_margin), 2)

    def generate_recommendation(
        self,
        predicted_price: float,
        total_cost: float,
        market_min: float | None = None,
        market_max: float | None = None,
        market_median: float | None = None,
        confidence_interval: tuple[float, float] | None = None,
    ) -> dict[str, Any]:
        """
        Synthesize ML prediction into a commercial price recommendation.
        Returns:
            - predicted_price_inr
            - recommended_price_inr
            - cost_floor_inr
            - competitive_price_low
            - competitive_price_high
            - pricing_strategy_note
        """
        predicted = max(10.0, round(float(predicted_price), 2))
        cost_floor = self.compute_cost_floor(total_cost)

        # Baseline competitive range derived from confidence interval or market stats
        if confidence_interval is not None:
            comp_low = max(cost_floor, round(float(confidence_interval[0]), 2))
            comp_high = max(comp_low, round(float(confidence_interval[1]), 2))
        elif market_min is not None and market_max is not None and market_min > 0 and market_max > 0:
            comp_low = max(cost_floor, round(float(market_min), 2))
            comp_high = max(comp_low, round(float(market_max), 2))
        else:
            comp_low = max(cost_floor, round(predicted * 0.88, 2))
            comp_high = max(comp_low, round(predicted * 1.12, 2))

        # Determine recommended price: ensure it never violates the cost floor
        if predicted < cost_floor:
            recommended = cost_floor
            strategy_note = (
                f"Model predicted ₹{predicted}, which is below the sustainable cost floor "
                f"(₹{cost_floor} based on {int(self.min_artisan_margin*100)}% min margin). "
                f"Recommended price adjusted upwards to cost floor to protect artisan livelihood."
            )
        else:
            recommended = predicted
            strategy_note = "Model predicted price comfortably exceeds production cost floor."

        # If market median is available and higher than prediction, advise on competitive room
        if market_median and market_median > recommended * 1.15:
            strategy_note += (
                f" Market median is ₹{market_median:.2f}, indicating headroom for premium positioning."
            )

        return {
            "predicted_price_inr": predicted,
            "recommended_price_inr": round(recommended, 2),
            "cost_floor_inr": cost_floor,
            "competitive_price_low": comp_low,
            "competitive_price_high": comp_high,
            "strategy_note": strategy_note,
        }
