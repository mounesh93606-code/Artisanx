import os
import pickle
from typing import List, Dict, Any, Tuple
import numpy as np
import pandas as pd
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from .text_features import TextFeatureExtractor, build_combined_text
from .image_features import extract_image_features
from .config import FEATURE_PIPELINE_PATH

class FeaturePipeline:
    def __init__(self, text_max_features: int = 250):
        self.text_extractor = TextFeatureExtractor(max_features=text_max_features)
        self.cat_encoder = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
        self.num_scaler = StandardScaler()
        self.is_fitted = False
        self.image_dim = 128  # default fallback dimension or 1280

    def _prepare_text_list(self, records: List[Dict[str, Any]]) -> List[str]:
        return [build_combined_text(r) for r in records]

    def _prepare_categorical_df(self, records: List[Dict[str, Any]]) -> pd.DataFrame:
        cats = []
        for r in records:
            cats.append({
                "category": str(r.get("category", "")).lower().strip(),
                "material": str(r.get("material", "")).lower().strip(),
                "craft_type": str(r.get("craft_type", "")).lower().strip()
            })
        return pd.DataFrame(cats)

    def _prepare_numerical_df(self, records: List[Dict[str, Any]]) -> np.ndarray:
        nums = []
        for r in records:
            nums.append([
                float(r.get("rating", 4.5)),
                float(r.get("review_count", 10))
            ])
        return np.array(nums, dtype=np.float32)

    def fit(self, records: List[Dict[str, Any]], image_embeddings: np.ndarray = None):
        # 1. Text
        texts = self._prepare_text_list(records)
        self.text_extractor.fit(texts)

        # 2. Categorical
        cat_df = self._prepare_categorical_df(records)
        self.cat_encoder.fit(cat_df)

        # 3. Numerical
        num_arr = self._prepare_numerical_df(records)
        self.num_scaler.fit(num_arr)

        if image_embeddings is not None and len(image_embeddings) > 0:
            self.image_dim = image_embeddings.shape[1]

        self.is_fitted = True
        return self

    def transform(self, records: List[Dict[str, Any]], image_embeddings: np.ndarray = None) -> np.ndarray:
        if not self.is_fitted:
            raise RuntimeError("FeaturePipeline is not fitted yet.")

        # 1. Text features
        texts = self._prepare_text_list(records)
        text_feats = self.text_extractor.transform(texts)

        # 2. Categorical features
        cat_df = self._prepare_categorical_df(records)
        cat_feats = self.cat_encoder.transform(cat_df)

        # 3. Numerical features
        num_arr = self._prepare_numerical_df(records)
        num_feats = self.num_scaler.transform(num_arr)

        # 4. Image features
        if image_embeddings is None:
            # Extract on the fly
            img_list = []
            for r in records:
                img_feat = extract_image_features(r.get("image_url") or r.get("image_bytes") or r.get("image_path"))
                if len(img_feat) != self.image_dim:
                    # Pad or truncate to match image_dim
                    padded = np.zeros(self.image_dim, dtype=np.float32)
                    m = min(len(img_feat), self.image_dim)
                    padded[:m] = img_feat[:m]
                    img_list.append(padded)
                else:
                    img_list.append(img_feat)
            image_embeddings = np.array(img_list, dtype=np.float32)

        return np.hstack([text_feats, cat_feats, num_feats, image_embeddings]).astype(np.float32)

    def fit_transform(self, records: List[Dict[str, Any]], image_embeddings: np.ndarray = None) -> np.ndarray:
        self.fit(records, image_embeddings)
        return self.transform(records, image_embeddings)

    def save(self, filepath: str = str(FEATURE_PIPELINE_PATH)):
        with open(filepath, "wb") as f:
            pickle.dump(self, f)

    @classmethod
    def load(cls, filepath: str = str(FEATURE_PIPELINE_PATH)) -> "FeaturePipeline":
        with open(filepath, "rb") as f:
            return pickle.load(f)
