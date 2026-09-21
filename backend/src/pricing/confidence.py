"""
Uncertainty quantification and confidence estimation for pricing predictions.
Implements empirical residual analysis and conformal prediction intervals to produce
rigorous, statistically defensible error bounds and confidence ratings.
"""
from typing import Any
import numpy as np


class UncertaintyEstimator:
    """Computes prediction intervals and confidence classifications based on calibration residuals."""

    def __init__(self, alpha: float = 0.15):
        """
        alpha: Error coverage rate (0.15 gives approximately 85% prediction intervals).
        """
        self.alpha = alpha
        self.residual_quantiles: tuple[float, float] = (-50.0, 50.0)
        self.relative_residuals: np.ndarray = np.array([0.10])
        self.is_calibrated = False

    def calibrate(self, y_true: np.ndarray, y_pred: np.ndarray) -> "UncertaintyEstimator":
        """Calibrate residual distribution on validation / cross-validation set."""
        y_true = np.asarray(y_true, dtype=float)
        y_pred = np.asarray(y_pred, dtype=float)

        residuals = y_true - y_pred
        # Absolute and relative residuals
        safe_pred = np.clip(y_pred, 1.0, None)
        self.relative_residuals = np.abs(residuals) / safe_pred

        # Quantile bounds for prediction interval
        lower_q = self.alpha / 2.0
        upper_q = 1.0 - (self.alpha / 2.0)
        self.residual_quantiles = (
            float(np.quantile(residuals, lower_q)),
            float(np.quantile(residuals, upper_q)),
        )
        self.is_calibrated = True
        return self

    def estimate_interval(self, predicted_price: float) -> tuple[float, float]:
        """Compute empirical prediction interval [low, high] for a given prediction."""
        if not self.is_calibrated:
            # Conservative default: ±15%
            return (
                round(max(10.0, predicted_price * 0.85), 2),
                round(predicted_price * 1.15, 2),
            )

        low = max(10.0, predicted_price + self.residual_quantiles[0])
        high = max(low + 5.0, predicted_price + self.residual_quantiles[1])
        return round(float(low), 2), round(float(high), 2)

    def assess_confidence(
        self,
        predicted_price: float,
        interval: tuple[float, float],
        has_cost_data: bool,
        has_market_data: bool,
        has_image: bool,
    ) -> str:
        """
        Determine confidence level ('high', 'medium', 'low') based on:
        1. Input data completeness (production costs, market comps, image)
        2. Relative width of the prediction interval
        """
        # Missing essential cost data automatically triggers low confidence
        if not has_cost_data:
            return "low"

        interval_width = interval[1] - interval[0]
        relative_width = interval_width / max(1.0, predicted_price)

        # Completeness score (0 to 3)
        data_points = int(has_cost_data) + int(has_market_data) + int(has_image)

        if data_points >= 3 and relative_width < 0.25:
            return "high"
        elif data_points >= 2 and relative_width < 0.40:
            return "medium"
        else:
            return "low"
