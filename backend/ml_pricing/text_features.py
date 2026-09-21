from typing import List, Dict, Any
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

def build_combined_text(row: Dict[str, Any]) -> str:
    parts = [
        str(row.get("title", "")),
        str(row.get("tags", "")),
        str(row.get("category", "")),
        str(row.get("material", "")),
        str(row.get("craft_type", "")),
        str(row.get("description", ""))
    ]
    return " ".join([p for p in parts if p]).strip()

class TextFeatureExtractor:
    def __init__(self, max_features: int = 300):
        self.vectorizer = TfidfVectorizer(
            sublinear_tf=True,
            ngram_range=(1, 2),
            max_features=max_features,
            stop_words="english"
        )
        self.is_fitted = False

    def fit(self, texts: List[str]):
        self.vectorizer.fit(texts)
        self.is_fitted = True
        return self

    def transform(self, texts: List[str]) -> np.ndarray:
        if not self.is_fitted:
            raise RuntimeError("TextFeatureExtractor is not fitted yet.")
        return self.vectorizer.transform(texts).toarray()

    def fit_transform(self, texts: List[str]) -> np.ndarray:
        res = self.vectorizer.fit_transform(texts).toarray()
        self.is_fitted = True
        return res
