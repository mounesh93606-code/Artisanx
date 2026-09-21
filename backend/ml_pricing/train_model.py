import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from xgboost import XGBRegressor

from .config import (
    CLEANED_CSV_PATH,
    FEATURE_PIPELINE_PATH,
    MODEL_VERSION
)
from .feature_engineering import FeaturePipeline
from .evaluation import evaluate_predictions, evaluate_by_category
from .model_registry import ModelRegistry

def train_pricing_model():
    print("=" * 60)
    print("ARTISANX — STARTING ML PRICE REGRESSION TRAINING PIPELINE")
    print("=" * 60)

    if not CLEANED_CSV_PATH.exists():
        raise FileNotFoundError(f"Cleaned dataset not found at {CLEANED_CSV_PATH}. Please run data_cleaner.py first.")

    df = pd.read_csv(CLEANED_CSV_PATH)
    if len(df) < 5:
        raise ValueError(f"Cleaned dataset in {CLEANED_CSV_PATH} has only {len(df)} rows. Need at least 5 rows.")

    print(f"Loaded {len(df)} cleaned market records.")

    # 1. Feature Engineering
    records = df.to_dict(orient="records")
    pipeline = FeaturePipeline(text_max_features=250)
    X = pipeline.fit_transform(records)
    y = df["price_inr"].values.astype(np.float32)

    print(f"Feature matrix shape: {X.shape} (Features per sample: {X.shape[1]})")

    # 2. Train / Validation Split
    test_size = 0.2 if len(df) >= 10 else 0.1
    X_train, X_val, y_train, y_val, df_train, df_val = train_test_split(
        X, y, df, test_size=test_size, random_state=42
    )

    print(f"Training rows: {len(X_train)} | Validation rows: {len(X_val)}")

    # 3. Model Training
    print("Training XGBoost Regressor...")
    model = XGBRegressor(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.08,
        subsample=0.9,
        colsample_bytree=0.9,
        random_state=42
    )
    model.fit(X_train, y_train)

    # 4. Evaluation
    y_pred_val = model.predict(X_val)
    val_metrics = evaluate_predictions(y_val, y_pred_val)
    cat_metrics = evaluate_by_category(df_val, "price_inr", y_pred_val)

    combined_metrics = {
        **val_metrics,
        "training_rows": int(len(X_train)),
        "validation_rows": int(len(X_val)),
        "category_evaluation": cat_metrics
    }

    print("-" * 60)
    print("MODEL VALIDATION METRICS:")
    print(f"  - MAE (Mean Absolute Error):         INR {val_metrics['mae']}")
    print(f"  - RMSE (Root Mean Squared Error):     INR {val_metrics['rmse']}")
    print(f"  - R² Score:                           {val_metrics['r2']}")
    print(f"  - Median Absolute Error:              INR {val_metrics['median_absolute_error']}")
    print("-" * 60)

    # 5. Persist Pipeline and Model
    pipeline.save(str(FEATURE_PIPELINE_PATH))
    print(f"Feature pipeline saved to: {FEATURE_PIPELINE_PATH}")

    ModelRegistry.save_model(
        model=model,
        metrics=combined_metrics,
        training_rows=len(X_train),
        validation_rows=len(X_val),
        version=MODEL_VERSION
    )

    print("=" * 60)
    print("TRAINING COMPLETED SUCCESSFULLY")
    print("=" * 60)
    return combined_metrics

if __name__ == "__main__":
    train_pricing_model()
