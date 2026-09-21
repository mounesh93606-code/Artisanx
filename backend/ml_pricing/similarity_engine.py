import os
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity

from .config import (
    CLEANED_CSV_PATH,
    SIM_WEIGHT_IMAGE,
    SIM_WEIGHT_TEXT,
    SIM_WEIGHT_CATEGORY_MATERIAL,
    SIM_WEIGHT_RECENCY
)
from .text_features import TextFeatureExtractor, build_combined_text
from .image_features import extract_image_features

class SimilarityEngine:
    def __init__(self, dataset_path: str = str(CLEANED_CSV_PATH)):
        self.dataset_path = dataset_path
        self.df: Optional[pd.DataFrame] = None
        self.text_extractor: Optional[TextFeatureExtractor] = None
        self.text_embeddings: Optional[np.ndarray] = None
        self.image_embeddings: Optional[np.ndarray] = None
        self._load_and_index()

    def _load_and_index(self):
        if not os.path.exists(self.dataset_path):
            print(f"SimilarityEngine note: cleaned dataset not found at {self.dataset_path}")
            return

        self.df = pd.read_csv(self.dataset_path)
        if self.df.empty:
            return

        # 1. Index text features
        records = self.df.to_dict(orient="records")
        texts = [build_combined_text(r) for r in records]
        self.text_extractor = TextFeatureExtractor(max_features=250)
        self.text_embeddings = self.text_extractor.fit_transform(texts)

        # 2. Extract or initialize image embeddings
        img_feats = []
        for r in records:
            # If image_url exists extract or fallback
            emb = extract_image_features(r.get("image_url"))
            img_feats.append(emb)
        self.image_embeddings = np.array(img_feats, dtype=np.float32)

    def find_top_comparables(
        self,
        query: Dict[str, Any],
        top_k: int = 3,
        min_similarity: float = 0.20
    ) -> List[Dict[str, Any]]:
        """
        Finds the top_k most similar authentic market products from the cleaned dataset.
        """
        if self.df is None or self.df.empty or self.text_extractor is None:
            self._load_and_index()

        if self.df is None or self.df.empty or self.text_extractor is None:
            return []

        # 1. Query text embedding
        q_text = build_combined_text(query)
        q_text_emb = self.text_extractor.transform([q_text])
        text_sims = cosine_similarity(q_text_emb, self.text_embeddings)[0]

        # 2. Query image embedding
        q_img_input = query.get("image") or query.get("image_url") or query.get("image_bytes") or query.get("image_path")
        q_img_emb = extract_image_features(q_img_input)
        
        # Ensure dimensions match
        if self.image_embeddings is not None and self.image_embeddings.shape[1] == len(q_img_emb) and np.linalg.norm(q_img_emb) > 0:
            img_sims = cosine_similarity(q_img_emb.reshape(1, -1), self.image_embeddings)[0]
        else:
            # Fallback if query has no image or dimension mismatch: rely on text similarity
            img_sims = text_sims.copy()

        # 3. Category & Material match
        q_cat = str(query.get("category", "")).lower().strip()
        q_mat = str(query.get("material", "")).lower().strip()
        q_craft = str(query.get("craft_type", "")).lower().strip()

        cat_sims = []
        recency_scores = []
        now_dt = datetime.now(timezone.utc)

        for _, row in self.df.iterrows():
            r_cat = str(row.get("category", "")).lower().strip()
            r_mat = str(row.get("material", "")).lower().strip()
            r_craft = str(row.get("craft_type", "")).lower().strip()

            score = 0.0
            if q_cat and (q_cat in r_cat or r_cat in q_cat):
                score += 0.4
            if q_mat and (q_mat in r_mat or r_mat in q_mat):
                score += 0.3
            if q_craft and (q_craft in r_craft or r_craft in q_craft):
                score += 0.3
            cat_sims.append(score)

            # Recency score (days elapsed decay)
            try:
                scraped_at = row.get("scraped_at")
                if scraped_at:
                    dt = datetime.fromisoformat(str(scraped_at).replace("Z", "+00:00"))
                    days = max(0, (now_dt - dt).days)
                    recency = max(0.5, 1.0 - (days / 365.0) * 0.5)
                else:
                    recency = 0.8
            except Exception:
                recency = 0.8
            recency_scores.append(recency)

        cat_sims = np.array(cat_sims, dtype=np.float32)
        recency_scores = np.array(recency_scores, dtype=np.float32)

        # 4. Hybrid weighted similarity
        total_scores = (
            SIM_WEIGHT_TEXT * text_sims +
            SIM_WEIGHT_IMAGE * img_sims +
            SIM_WEIGHT_CATEGORY_MATERIAL * cat_sims +
            SIM_WEIGHT_RECENCY * recency_scores
        )

        # 5. Rank and filter
        ranked_indices = np.argsort(total_scores)[::-1]
        
        top_comparables = []
        for idx in ranked_indices:
            sim = float(total_scores[idx])
            if sim < min_similarity and len(top_comparables) >= 1:
                # Require at least minimal similarity, unless we have no candidates
                break

            row = self.df.iloc[idx]
            # Normalize display similarity percentage between 75% and 99% for top relevant items
            display_sim = round(min(0.98, max(0.70, sim)), 2)

            comp = {
                "id": str(row.get("id")),
                "title": str(row.get("title")),
                "price": float(row.get("price_inr")),
                "source": str(row.get("source_name")),
                "url": str(row.get("product_url", "")),
                "image_url": str(row.get("image_url", "")),
                "similarity": display_sim,
                "category": str(row.get("category", "")),
                "material": str(row.get("material", "")),
                "craft_type": str(row.get("craft_type", "")),
                "collection_date": str(row.get("scraped_at", ""))[:10]
            }
            top_comparables.append(comp)

            if len(top_comparables) == top_k:
                break

        return top_comparables
