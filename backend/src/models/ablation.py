"""
Multimodal Ablation Study module.
Rigorously evaluates the marginal predictive contribution of each data modality:
- Model A: Tabular features only
- Model B: Tabular + Text embeddings
- Model C: Tabular + Image embeddings
- Model D: Full Multimodal (Tabular + Text + Image embeddings)
"""
from typing import Any
import numpy as np
import pandas as pd
from src.models.evaluation import calculate_metrics
from src.utils.logger import get_logger

logger = get_logger("ablation_study")


class MultimodalAblationStudy:
    """Executes ablation study across tabular, text, and visual modalities."""

    def __init__(self, base_estimator_factory):
        """
        base_estimator_factory: Callable returning a fresh estimator instance (e.g. CatBoost or XGBoost).
        """
        self.factory = base_estimator_factory

    def run_ablation(
        self,
        X_tab_train: np.ndarray,
        X_tab_test: np.ndarray,
        X_text_train: np.ndarray,
        X_text_test: np.ndarray,
        X_img_train: np.ndarray,
        X_img_test: np.ndarray,
        y_train: np.ndarray,
        y_test: np.ndarray,
    ) -> tuple[pd.DataFrame, dict[str, Any]]:
        """
        Train 4 configurations on identical data and evaluate test metrics.
        Returns (ablation_df, fitted_ablation_models).
        """
        configurations = {
            "Model A (Tabular Only)": {
                "X_train": X_tab_train,
                "X_test": X_tab_test,
                "description": "Production costs, craft attributes, and market metrics",
            },
            "Model B (Tabular + Text)": {
                "X_train": np.hstack([X_tab_train, X_text_train]),
                "X_test": np.hstack([X_tab_test, X_text_test]),
                "description": "Tabular features + dense semantic text embeddings",
            },
            "Model C (Tabular + Image)": {
                "X_train": np.hstack([X_tab_train, X_img_train]),
                "X_test": np.hstack([X_tab_test, X_img_test]),
                "description": "Tabular features + pretrained visual embeddings",
            },
            "Model D (Full Multimodal)": {
                "X_train": np.hstack([X_tab_train, X_text_train, X_img_train]),
                "X_test": np.hstack([X_tab_test, X_text_test, X_img_test]),
                "description": "Tabular + Text + Image visual embeddings",
            },
        }

        results = []
        fitted_models: dict[str, Any] = {}

        logger.info("Starting Multimodal Ablation Study...")

        for name, config in configurations.items():
            model = self.factory()
            model.fit(config["X_train"], y_train)
            fitted_models[name] = model

            y_pred = model.predict(config["X_test"])
            metrics = calculate_metrics(y_test, y_pred)

            results.append({
                "Configuration": name,
                "Features Count": config["X_train"].shape[1],
                "MAE (₹)": metrics["MAE"],
                "RMSE (₹)": metrics["RMSE"],
                "R2": metrics["R2"],
                "MAPE (%)": metrics["MAPE"],
                "Description": config["description"],
            })

            logger.info(
                f"[{name}] Feats: {config['X_train'].shape[1]} | MAE: ₹{metrics['MAE']} | "
                f"RMSE: ₹{metrics['RMSE']} | R2: {metrics['R2']}"
            )

        df_ablation = pd.DataFrame(results)

        # Calculate delta compared to Model A (baseline tabular)
        tab_mae = df_ablation.loc[df_ablation["Configuration"] == "Model A (Tabular Only)", "MAE (₹)"].values[0]
        df_ablation["MAE Lift vs Tabular (₹)"] = np.round(tab_mae - df_ablation["MAE (₹)"], 2)

        return df_ablation, fitted_models
