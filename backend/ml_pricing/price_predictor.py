import os
from typing import Dict, Any, Optional
import numpy as np

from .config import FEATURE_PIPELINE_PATH, MODEL_LATEST_PATH
from .feature_engineering import FeaturePipeline
from .model_registry import ModelRegistry

class PricePredictor:
    def __init__(self):
        self.model = None
        self.pipeline: Optional[FeaturePipeline] = None
        self._load()

    def _load(self):
        if MODEL_LATEST_PATH.exists() and FEATURE_PIPELINE_PATH.exists():
            try:
                self.model = ModelRegistry.load_latest_model()
                self.pipeline = FeaturePipeline.load(str(FEATURE_PIPELINE_PATH))
            except Exception as e:
                print(f"PricePredictor load error: {e}")

    def predict(self, product_info: Dict[str, Any]) -> float:
        if self.model is None or self.pipeline is None:
            self._load()

        if self.model is None or self.pipeline is None:
            # Fallback estimation if model not yet trained
            return 950.0

        try:
            X = self.pipeline.transform([product_info])
            pred = float(self.model.predict(X)[0])
            return max(50.0, round(pred, 2))
        except Exception as e:
            print(f"Prediction error: {e}")
            return 950.0
