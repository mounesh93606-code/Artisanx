"""
Model comparison and cross-validation framework.
Trains and compares multiple regression algorithms (Dummy, Ridge, Random Forest,
Extra Trees, HistGBDT, XGBoost, LightGBM, CatBoost) under identical splits and metrics.
"""
import time
from pathlib import Path
from typing import Any
import numpy as np
import pandas as pd
from sklearn.model_selection import KFold, cross_validate

from src.models.baseline import get_baseline_models
from src.models.tree_models import get_tree_models
from src.models.evaluation import calculate_metrics
from src.utils.config import REPORTS_DIR, RANDOM_SEED
from src.utils.logger import get_logger

logger = get_logger("model_comparison")


class ModelComparator:
    """Orchestrates cross-validation and held-out comparison of regression models."""

    def __init__(self, random_state: int = RANDOM_SEED, cv_splits: int = 5):
        self.random_state = random_state
        self.cv_splits = cv_splits
        self.models: dict[str, Any] = {}
        self._init_all_models()

    def _init_all_models(self) -> None:
        """Register all candidate models."""
        self.models.update(get_baseline_models())
        self.models.update(get_tree_models(random_state=self.random_state))

    def run_cross_validation(
        self, X: np.ndarray, y: np.ndarray
    ) -> pd.DataFrame:
        """Run K-Fold cross-validation on all models and collect metrics."""
        cv = KFold(n_splits=self.cv_splits, shuffle=True, random_state=self.random_state)
        results = []

        logger.info(f"Starting {self.cv_splits}-Fold Cross-Validation across {len(self.models)} models...")

        for name, model in self.models.items():
            t0 = time.time()
            scoring = {
                "mae": "neg_mean_absolute_error",
                "rmse": "neg_root_mean_squared_error",
                "r2": "r2",
            }
            try:
                cv_res = cross_validate(model, X, y, cv=cv, scoring=scoring, n_jobs=1)
                train_time = round(time.time() - t0, 3)

                mean_mae = -float(np.mean(cv_res["test_mae"]))
                std_mae = float(np.std(cv_res["test_mae"]))
                mean_rmse = -float(np.mean(cv_res["test_rmse"]))
                mean_r2 = float(np.mean(cv_res["test_r2"]))

                results.append({
                    "Model": name,
                    "CV Mean MAE (₹)": round(mean_mae, 2),
                    "CV Std MAE (₹)": round(std_mae, 2),
                    "CV Mean RMSE (₹)": round(mean_rmse, 2),
                    "CV Mean R2": round(mean_r2, 4),
                    "CV Time (s)": train_time,
                })
                logger.info(f"[{name}] CV MAE: ₹{mean_mae:.2f} (±{std_mae:.2f}), R2: {mean_r2:.4f}")
            except Exception as e:
                logger.warning(f"Error evaluating {name} with CV: {e}")

        df_cv = pd.DataFrame(results).sort_values("CV Mean MAE (₹)", ascending=True)
        return df_cv

    def compare_on_test_set(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_test: np.ndarray,
        y_test: np.ndarray,
    ) -> tuple[pd.DataFrame, dict[str, Any], str]:
        """
        Fit each model on training set and evaluate on test set.
        Measure exact training time and per-sample inference latency.
        Returns: (comparison_df, trained_models_dict, best_model_name)
        """
        results = []
        fitted_models: dict[str, Any] = {}

        logger.info("Evaluating all candidate models on held-out test set...")

        for name, model in self.models.items():
            try:
                # Measure training time
                t_train_start = time.time()
                model.fit(X_train, y_train)
                train_duration = round(time.time() - t_train_start, 3)
                fitted_models[name] = model

                # Measure inference latency
                t_inf_start = time.time()
                y_pred = model.predict(X_test)
                inf_duration_ms = round(((time.time() - t_inf_start) / len(X_test)) * 1000, 3)

                metrics = calculate_metrics(y_test, y_pred)

                results.append({
                    "Model": name,
                    "MAE (₹)": metrics["MAE"],
                    "RMSE (₹)": metrics["RMSE"],
                    "R2": metrics["R2"],
                    "MAPE (%)": metrics["MAPE"],
                    "Train Time (s)": train_duration,
                    "Inference Time (ms/sample)": inf_duration_ms,
                })
                logger.info(
                    f"[{name}] Test MAE: ₹{metrics['MAE']}, RMSE: ₹{metrics['RMSE']}, "
                    f"R2: {metrics['R2']}, Train: {train_duration}s, Inf: {inf_duration_ms}ms"
                )
            except Exception as e:
                logger.error(f"Failed to fit/predict {name}: {e}")

        df_comp = pd.DataFrame(results).sort_values("MAE (₹)", ascending=True)

        # Export model comparison CSV
        csv_path = REPORTS_DIR / "model_comparison.csv"
        csv_path.parent.mkdir(parents=True, exist_ok=True)
        df_comp.to_csv(csv_path, index=False)
        logger.info(f"Model comparison saved to {csv_path}")

        best_model_name = df_comp.iloc[0]["Model"]
        logger.info(f"Selected Best Model: {best_model_name}")

        return df_comp, fitted_models, best_model_name
