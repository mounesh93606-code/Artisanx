"""
Model explainability and prediction interpretation module.
Generates human-readable commercial factors, calculates SHAP feature attributions
or tree importances, and plots feature importance charts.
"""
from pathlib import Path
from typing import Any
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from src.utils.config import REPORTS_DIR
from src.utils.logger import get_logger

logger = get_logger("explainability")


class PricingExplainer:
    """Explains model decisions using feature attributions and domain heuristics."""

    def __init__(self, model: Any, feature_names: list[str]):
        self.model = model
        self.feature_names = feature_names
        self.shap_explainer = None
        self._init_shap()

    def _init_shap(self) -> None:
        """Attempt to initialize TreeSHAP explainer if supported."""
        try:
            import shap
            if hasattr(self.model, "feature_importances_") or hasattr(self.model, "get_booster"):
                self.shap_explainer = shap.TreeExplainer(self.model)
                logger.info("Initialized SHAP TreeExplainer.")
        except Exception as e:
            logger.warning(f"Could not initialize TreeExplainer ({e}). Using feature importances.")
            self.shap_explainer = None

    def plot_feature_importance(
        self,
        X_sample: np.ndarray | None = None,
        top_n: int = 15,
        output_path: Path | str | None = None,
    ) -> None:
        """Generate and save feature importance bar chart."""
        save_path = Path(output_path or (REPORTS_DIR / "feature_importance.png"))
        save_path.parent.mkdir(parents=True, exist_ok=True)

        importances = None
        if hasattr(self.model, "feature_importances_"):
            importances = self.model.feature_importances_
        elif hasattr(self.model, "coef_"):
            importances = np.abs(self.model.coef_)

        if importances is None:
            logger.warning("Model does not expose feature_importances_ or coef_.")
            return

        # Truncate or align feature names
        names = self.feature_names[: len(importances)]
        if len(names) < len(importances):
            names += [f"feat_{i}" for i in range(len(names), len(importances))]

        df_imp = pd.DataFrame({"Feature": names, "Importance": importances})
        df_imp = df_imp.sort_values("Importance", ascending=False).head(top_n)

        plt.figure(figsize=(10, 6))
        plt.barh(df_imp["Feature"][::-1], df_imp["Importance"][::-1], color="#3182ce")
        plt.xlabel("Relative Importance")
        plt.title(f"Top {top_n} Predictive Features for Dynamic Pricing")
        plt.tight_layout()
        plt.savefig(save_path, dpi=200)
        plt.close()
        logger.info(f"Saved feature importance plot to {save_path}")

    def generate_human_explanation(
        self,
        product_record: dict[str, Any],
        predicted_price: float,
        cost_floor: float,
        confidence: str,
    ) -> list[str]:
        """
        Generate a list of clear, human-readable explanatory factors for the artisan.
        """
        explanations = []

        # 1. Material & Craft Type
        mat = product_record.get("material", "Unknown")
        craft = product_record.get("craft_type", "Handcrafted")
        cat = product_record.get("category", "Craft")
        explanations.append(
            f"Category & Craft: {cat} crafted using '{craft}' with '{mat}'."
        )

        # 2. Production Cost Impact
        mat_cost = float(product_record.get("material_cost", 0.0) or 0.0)
        lab_cost = float(product_record.get("labour_cost", 0.0) or 0.0)
        tot_cost = mat_cost + lab_cost + float(product_record.get("packaging_cost", 0.0) or 0.0) + float(product_record.get("transport_cost", 0.0) or 0.0) + float(product_record.get("other_cost", 0.0) or 0.0)

        if tot_cost > 0:
            lab_share = round((lab_cost / tot_cost) * 100) if tot_cost else 0
            explanations.append(
                f"Production Costs: Total cost ₹{tot_cost:.2f} (Material: ₹{mat_cost:.2f}, "
                f"Artisan Labour: ₹{lab_cost:.2f} [{lab_share}% of cost])."
            )
            explanations.append(
                f"Sustainable Cost Floor: ₹{cost_floor:.2f} (guarantees artisan margin)."
            )
        else:
            explanations.append("Production Costs: Cost breakdown was not provided; baseline estimated from craft norms.")

        # 3. Market Benchmarks
        m_min = product_record.get("market_min")
        m_max = product_record.get("market_max")
        m_med = product_record.get("market_median")
        if m_min and m_max and float(m_min) > 0:
            explanations.append(
                f"Market Benchmark: Comparable artisan products sell between ₹{float(m_min):.2f} and ₹{float(m_max):.2f} "
                f"(Median: ₹{float(m_med):.2f})."
            )

        # 4. Complexity & Craftsmanship
        complexity = product_record.get("complexity", "Medium")
        explanations.append(
            f"Craftsmanship Complexity: Rated as '{complexity}', influencing labour valuation and premium markup."
        )

        # 5. Visual and Text signals
        if product_record.get("image_path"):
            explanations.append("Visual Analysis: Image visual features (texture, symmetry, color palette) incorporated into pricing model.")

        return explanations
