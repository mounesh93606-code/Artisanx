import os
import json
import pickle
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional

from .config import (
    MODELS_DIR,
    MODEL_LATEST_PATH,
    MODEL_METADATA_PATH,
    MODEL_METRICS_PATH,
    MODEL_VERSION,
    FEATURE_VERSION
)

class ModelRegistry:
    @staticmethod
    def save_model(
        model: Any,
        metrics: Dict[str, Any],
        training_rows: int,
        validation_rows: int,
        version: str = MODEL_VERSION
    ) -> str:
        MODELS_DIR.mkdir(parents=True, exist_ok=True)

        # 1. Save versioned model and latest model
        versioned_path = MODELS_DIR / f"price_model_{version}.pkl"
        with open(versioned_path, "wb") as f:
            pickle.dump(model, f)
        with open(MODEL_LATEST_PATH, "wb") as f:
            pickle.dump(model, f)

        # 2. Save metrics
        with open(MODEL_METRICS_PATH, "w", encoding="utf-8") as f:
            json.dump(metrics, f, indent=2)

        # 3. Save metadata
        metadata = {
            "model_version": version,
            "feature_version": FEATURE_VERSION,
            "training_date": datetime.now(timezone.utc).isoformat(),
            "training_rows": training_rows,
            "validation_rows": validation_rows,
            "metrics": metrics,
            "model_path": str(versioned_path),
            "latest_path": str(MODEL_LATEST_PATH)
        }
        with open(MODEL_METADATA_PATH, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

        print(f"Model saved to: {versioned_path} and {MODEL_LATEST_PATH}")
        return str(MODEL_LATEST_PATH)

    @staticmethod
    def load_latest_model() -> Optional[Any]:
        if not MODEL_LATEST_PATH.exists():
            return None
        with open(MODEL_LATEST_PATH, "rb") as f:
            return pickle.load(f)

    @staticmethod
    def load_metadata() -> Dict[str, Any]:
        if not MODEL_METADATA_PATH.exists():
            return {}
        with open(MODEL_METADATA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
