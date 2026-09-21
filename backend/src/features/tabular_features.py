"""
Tabular feature engineering and preprocessing pipeline.
Generates derived economic features, scales numerical columns,
encodes categorical variables, and handles missing market/cost data.
"""
import json
from pathlib import Path
from typing import Any
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from src.utils.config import (
    CATEGORICAL_FEATURES,
    NUMERICAL_FEATURES,
    DERIVED_NUMERICAL_FEATURES,
    MODELS_DIR,
)
from src.utils.logger import get_logger

logger = get_logger("tabular_features")


def compute_derived_features(df: pd.DataFrame) -> pd.DataFrame:
    """Compute mathematically valid derived features and missingness flags."""
    df_feat = df.copy()

    def _get_series(col_name: str, default_val: float = 0.0) -> pd.Series:
        if col_name in df_feat.columns:
            return pd.to_numeric(df_feat[col_name], errors="coerce").fillna(default_val)
        return pd.Series(default_val, index=df_feat.index)

    # Cost indicators and totals
    mat_cost = _get_series("material_cost", 0.0)
    lab_cost = _get_series("labour_cost", 0.0)
    pkg_cost = _get_series("packaging_cost", 0.0)
    trn_cost = _get_series("transport_cost", 0.0)
    oth_cost = _get_series("other_cost", 0.0)

    total_cost = mat_cost + lab_cost + pkg_cost + trn_cost + oth_cost
    df_feat["total_cost"] = total_cost

    qty = _get_series("quantity", 1.0).clip(lower=1.0)
    df_feat["cost_per_unit"] = total_cost / qty

    safe_total = total_cost.clip(lower=1.0)
    df_feat["labour_cost_ratio"] = lab_cost / safe_total
    df_feat["material_cost_ratio"] = mat_cost / safe_total

    # Cost data availability indicator
    df_feat["has_cost_data"] = (total_cost > 0).astype(float)

    # Market information features & indicators
    m_min = _get_series("market_min", np.nan)
    m_max = _get_series("market_max", np.nan)
    m_p25 = _get_series("market_p25", np.nan)
    m_p75 = _get_series("market_p75", np.nan)

    df_feat["market_spread"] = (m_max - m_min).fillna(0.0).clip(lower=0.0)
    df_feat["market_iqr"] = (m_p75 - m_p25).fillna(0.0).clip(lower=0.0)
    df_feat["has_market_data"] = (
        (m_min.notna() & (m_min > 0)).astype(float)
        if "market_min" in df_feat.columns
        else pd.Series(0.0, index=df_feat.index)
    )

    return df_feat


class TabularFeaturePipeline:
    """End-to-end scikit-learn tabular transformer and encoder."""

    def __init__(self, cat_features: list[str] | None = None, num_features: list[str] | None = None):
        self.cat_features = cat_features or CATEGORICAL_FEATURES
        self.num_features = (num_features or NUMERICAL_FEATURES) + DERIVED_NUMERICAL_FEATURES
        self.pipeline: ColumnTransformer | None = None
        self.feature_names_out: list[str] = []

    def build_pipeline(self) -> ColumnTransformer:
        """Construct ColumnTransformer with imputation, scaling, and encoding."""
        num_transformer = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="median")),
                ("scaler", StandardScaler()),
            ]
        )

        cat_transformer = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="constant", fill_value="Unknown")),
                (
                    "onehot",
                    OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                ),
            ]
        )

        transformer = ColumnTransformer(
            transformers=[
                ("num", num_transformer, self.num_features),
                ("cat", cat_transformer, self.cat_features),
            ],
            remainder="drop",
        )
        return transformer

    def fit(self, df: pd.DataFrame) -> "TabularFeaturePipeline":
        """Fit preprocessing pipeline on tabular dataframe."""
        df_feat = compute_derived_features(df)
        self.pipeline = self.build_pipeline()
        self.pipeline.fit(df_feat)

        # Extract output feature names
        num_names = self.num_features
        cat_encoder = self.pipeline.named_transformers_["cat"].named_steps["onehot"]
        cat_names = list(cat_encoder.get_feature_names_out(self.cat_features))
        self.feature_names_out = num_names + cat_names
        logger.info(f"Tabular pipeline fitted with {len(self.feature_names_out)} total features.")
        return self

    def transform(self, df: pd.DataFrame) -> np.ndarray:
        """Transform dataframe to numeric feature matrix."""
        if self.pipeline is None:
            raise RuntimeError("Pipeline must be fitted before calling transform.")
        df_feat = compute_derived_features(df)
        # Ensure all expected columns exist with defaults
        for col in self.num_features:
            if col not in df_feat.columns:
                df_feat[col] = np.nan
        for col in self.cat_features:
            if col not in df_feat.columns:
                df_feat[col] = "Unknown"
        return self.pipeline.transform(df_feat)

    def fit_transform(self, df: pd.DataFrame) -> np.ndarray:
        """Fit pipeline and transform dataframe."""
        return self.fit(df).transform(df)

    def save(self, filepath: Path | str | None = None, schema_path: Path | str | None = None) -> None:
        """Save pipeline artifact and feature schema."""
        save_file = Path(filepath or (MODELS_DIR / "preprocessing_pipeline.pkl"))
        save_file.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.pipeline, save_file)

        schema = {
            "num_features": self.num_features,
            "cat_features": self.cat_features,
            "feature_names_out": self.feature_names_out,
            "total_feature_count": len(self.feature_names_out),
        }
        schema_file = Path(schema_path or (MODELS_DIR / "feature_schema.json"))
        with open(schema_file, "w", encoding="utf-8") as f:
            json.dump(schema, f, indent=2)

        logger.info(f"Pipeline saved to {save_file} and schema to {schema_file}")

    @classmethod
    def load(cls, filepath: Path | str | None = None) -> "TabularFeaturePipeline":
        """Load saved pipeline artifact."""
        load_file = Path(filepath or (MODELS_DIR / "preprocessing_pipeline.pkl"))
        schema_file = load_file.parent / "feature_schema.json"

        instance = cls()
        instance.pipeline = joblib.load(load_file)
        if schema_file.exists():
            with open(schema_file, "r", encoding="utf-8") as f:
                schema = json.load(f)
                instance.num_features = schema.get("num_features", [])
                instance.cat_features = schema.get("cat_features", [])
                instance.feature_names_out = schema.get("feature_names_out", [])
        return instance
