"""
Advanced tree-based and gradient-boosted regression models for artisan product pricing.
Configures Random Forest, Extra Trees, HistGradientBoosting, XGBoost, LightGBM, and CatBoost.
"""
from typing import Any
from sklearn.ensemble import (
    RandomForestRegressor,
    ExtraTreesRegressor,
    HistGradientBoostingRegressor,
)

from src.utils.logger import get_logger

logger = get_logger("tree_models")


def get_tree_models(random_state: int = 42) -> dict[str, Any]:
    """Return dictionary of advanced tree and gradient boosting models."""
    models: dict[str, Any] = {
        "Random Forest": RandomForestRegressor(
            n_estimators=200,
            max_depth=12,
            min_samples_split=4,
            random_state=random_state,
            n_jobs=-1,
        ),
        "Extra Trees": ExtraTreesRegressor(
            n_estimators=200,
            max_depth=12,
            min_samples_split=4,
            random_state=random_state,
            n_jobs=-1,
        ),
        "HistGradientBoosting": HistGradientBoostingRegressor(
            max_iter=200,
            max_depth=8,
            learning_rate=0.08,
            random_state=random_state,
        ),
    }

    # XGBoost
    try:
        from xgboost import XGBRegressor
        models["XGBoost"] = XGBRegressor(
            n_estimators=250,
            max_depth=6,
            learning_rate=0.06,
            subsample=0.85,
            colsample_bytree=0.85,
            random_state=random_state,
            n_jobs=-1,
        )
    except ImportError:
        logger.warning("XGBoost is not installed. Skipping.")

    # LightGBM
    try:
        from lightgbm import LGBMRegressor
        models["LightGBM"] = LGBMRegressor(
            n_estimators=250,
            max_depth=7,
            learning_rate=0.06,
            num_leaves=31,
            subsample=0.85,
            random_state=random_state,
            verbose=-1,
            n_jobs=-1,
        )
    except ImportError:
        logger.warning("LightGBM is not installed. Skipping.")

    # CatBoost
    try:
        from catboost import CatBoostRegressor
        models["CatBoost"] = CatBoostRegressor(
            iterations=300,
            depth=6,
            learning_rate=0.06,
            random_seed=random_state,
            verbose=0,
            thread_count=-1,
        )
    except ImportError:
        logger.warning("CatBoost is not installed. Skipping.")

    return models
