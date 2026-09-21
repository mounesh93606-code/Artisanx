"""
Baseline regression models for artisan product pricing.
Includes naive dummy baselines and regularized linear regression baselines.
"""
from typing import Any
import numpy as np
from sklearn.dummy import DummyRegressor
from sklearn.linear_model import Ridge, Lasso, ElasticNet


def get_baseline_models() -> dict[str, Any]:
    """Return dictionary of baseline regression models."""
    return {
        "Dummy (Median)": DummyRegressor(strategy="median"),
        "Dummy (Mean)": DummyRegressor(strategy="mean"),
        "Ridge Regression": Ridge(alpha=10.0, random_state=42),
        "Lasso Regression": Lasso(alpha=1.0, random_state=42, max_iter=2000),
        "ElasticNet": ElasticNet(alpha=0.5, l1_ratio=0.5, random_state=42, max_iter=2000),
    }
