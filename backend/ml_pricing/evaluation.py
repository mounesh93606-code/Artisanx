from typing import Dict, Any, List
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, median_absolute_error

def evaluate_predictions(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    mae = float(mean_absolute_error(y_true, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    r2 = float(r2_score(y_true, y_pred)) if len(y_true) > 1 else 1.0
    med_ae = float(median_absolute_error(y_true, y_pred))

    return {
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "r2": round(max(0.0, r2), 4),
        "median_absolute_error": round(med_ae, 2)
    }

def evaluate_by_category(df: pd.DataFrame, y_true_col: str, y_pred: np.ndarray) -> Dict[str, Dict[str, float]]:
    cat_metrics = {}
    df_eval = df.copy()
    df_eval["pred"] = y_pred

    for cat, group in df_eval.groupby("category"):
        if len(group) >= 2:
            metrics = evaluate_predictions(group[y_true_col].values, group["pred"].values)
            cat_metrics[str(cat)] = metrics
        else:
            cat_metrics[str(cat)] = {"sample_count": len(group)}

    return cat_metrics
