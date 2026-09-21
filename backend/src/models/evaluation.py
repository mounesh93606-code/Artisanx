"""
Model evaluation, pricing-specific error metrics, category breakdown, and error analysis.
Calculates MAE (in INR), RMSE, R², MAPE, and produces structured error analysis reports.
"""
import json
from pathlib import Path
from typing import Any
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score

from src.utils.config import REPORTS_DIR
from src.utils.logger import get_logger

logger = get_logger("evaluation")


def calculate_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, float]:
    """Calculate core regression metrics for pricing evaluation."""
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)

    mae = float(mean_absolute_error(y_true, y_pred))
    rmse = float(root_mean_squared_error(y_true, y_pred))
    r2 = float(r2_score(y_true, y_pred))

    # MAPE: Safe calculation avoiding division by zero
    non_zero_mask = y_true > 0
    if np.any(non_zero_mask):
        mape = float(np.mean(np.abs((y_true[non_zero_mask] - y_pred[non_zero_mask]) / y_true[non_zero_mask])) * 100.0)
    else:
        mape = float("nan")

    return {
        "MAE": round(mae, 2),
        "RMSE": round(rmse, 2),
        "R2": round(r2, 4),
        "MAPE": round(mape, 2),
    }


def evaluate_by_category(
    df_test: pd.DataFrame, y_true: np.ndarray, y_pred: np.ndarray, category_col: str = "category"
) -> pd.DataFrame:
    """Break down evaluation metrics by craft category."""
    df_eval = df_test.copy()
    df_eval["y_true"] = y_true
    df_eval["y_pred"] = y_pred
    df_eval["abs_error"] = np.abs(y_true - y_pred)
    df_eval["pct_error"] = (df_eval["abs_error"] / np.clip(y_true, 1.0, None)) * 100.0

    records = []
    for cat, group in df_eval.groupby(category_col):
        metrics = calculate_metrics(group["y_true"].values, group["y_pred"].values)
        records.append({
            "Category": cat,
            "Sample Count": len(group),
            "Mean Actual (₹)": round(group["y_true"].mean(), 2),
            "Mean Predicted (₹)": round(group["y_pred"].mean(), 2),
            "MAE (₹)": metrics["MAE"],
            "RMSE (₹)": metrics["RMSE"],
            "R2": metrics["R2"],
            "MAPE (%)": metrics["MAPE"],
        })

    df_cat = pd.DataFrame(records).sort_values("MAE (₹)", ascending=True)
    return df_cat


def evaluate_by_price_tier(
    y_true: np.ndarray, y_pred: np.ndarray
) -> pd.DataFrame:
    """Break down performance by price tiers in INR."""
    tiers = [
        ("< ₹500", 0, 500),
        ("₹500 - ₹1,500", 500, 1500),
        ("₹1,500 - ₹3,000", 1500, 3000),
        ("> ₹3,000", 3000, 1e9),
    ]

    records = []
    for label, low, high in tiers:
        mask = (y_true >= low) & (y_true < high)
        if np.any(mask):
            sub_true = y_true[mask]
            sub_pred = y_pred[mask]
            m = calculate_metrics(sub_true, sub_pred)
            records.append({
                "Price Tier": label,
                "Count": int(mask.sum()),
                "MAE (₹)": m["MAE"],
                "RMSE (₹)": m["RMSE"],
                "R2": m["R2"],
                "MAPE (%)": m["MAPE"],
            })

    return pd.DataFrame(records)


def perform_error_analysis(
    df_test: pd.DataFrame,
    y_true: np.ndarray,
    y_pred: np.ndarray,
    output_csv: Path | str | None = None,
    output_html: Path | str | None = None,
) -> tuple[pd.DataFrame, pd.DataFrame, dict[str, Any]]:
    """
    Perform deep error analysis:
    - Identify highest overpredictions and underpredictions
    - Analyze potential reasons (cost ratios, complexity, missing data)
    - Export reports
    """
    df_analysis = df_test.copy()
    df_analysis["actual_price"] = y_true
    df_analysis["predicted_price"] = np.round(y_pred, 2)
    df_analysis["error_inr"] = np.round(df_analysis["predicted_price"] - df_analysis["actual_price"], 2)
    df_analysis["abs_error_inr"] = np.round(np.abs(df_analysis["error_inr"]), 2)
    df_analysis["pct_error"] = np.round((df_analysis["abs_error_inr"] / np.clip(y_true, 1.0, None)) * 100.0, 2)

    # Top 10 overpredictions (predicted >> actual)
    top_over = df_analysis.sort_values("error_inr", ascending=False).head(10)

    # Top 10 underpredictions (predicted << actual)
    top_under = df_analysis.sort_values("error_inr", ascending=True).head(10)

    # Save comprehensive error analysis CSV
    csv_path = Path(output_csv or (REPORTS_DIR / "error_analysis.csv"))
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    df_analysis.to_csv(csv_path, index=False)
    logger.info(f"Detailed error analysis saved to {csv_path}")

    summary = {
        "mean_error_bias": round(float(np.mean(df_analysis["error_inr"])), 2),
        "median_abs_error": round(float(np.median(df_analysis["abs_error_inr"])), 2),
        "max_overprediction": round(float(top_over["error_inr"].max()), 2) if not top_over.empty else 0.0,
        "max_underprediction": round(float(top_under["error_inr"].min()), 2) if not top_under.empty else 0.0,
        "error_std": round(float(np.std(df_analysis["error_inr"])), 2),
    }

    # Generate HTML report
    html_path = Path(output_html or (REPORTS_DIR / "evaluation_report.html"))
    generate_html_evaluation_report(
        html_path=html_path,
        overall_metrics=calculate_metrics(y_true, y_pred),
        category_df=evaluate_by_category(df_test, y_true, y_pred),
        tier_df=evaluate_by_price_tier(y_true, y_pred),
        top_over=top_over,
        top_under=top_under,
        summary=summary,
    )

    return top_over, top_under, summary


def generate_html_evaluation_report(
    html_path: Path,
    overall_metrics: dict[str, float],
    category_df: pd.DataFrame,
    tier_df: pd.DataFrame,
    top_over: pd.DataFrame,
    top_under: pd.DataFrame,
    summary: dict[str, Any],
) -> None:
    """Generate a clean, professional HTML evaluation and error analysis report."""
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Artisan Dynamic Pricing ML - Evaluation & Error Report</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; color: #2c3e50; background: #f8f9fa; }}
        h1, h2, h3 {{ color: #1a365d; }}
        .metric-grid {{ display: flex; gap: 20px; margin-bottom: 30px; }}
        .card {{ background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); flex: 1; }}
        .card .title {{ font-size: 14px; color: #718096; text-transform: uppercase; font-weight: 600; }}
        .card .value {{ font-size: 28px; font-weight: bold; color: #2b6cb0; margin-top: 8px; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 15px; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }}
        th, td {{ padding: 12px 16px; text-align: left; border-bottom: 1px solid #e2e8f0; }}
        th {{ background: #edf2f7; font-weight: 600; color: #4a5568; }}
        tr:hover {{ background: #f7fafc; }}
        .over {{ color: #c53030; font-weight: bold; }}
        .under {{ color: #dd6b20; font-weight: bold; }}
    </style>
</head>
<body>
    <h1>Artisan Dynamic Pricing ML — Evaluation & Error Analysis Report</h1>
    <p>Comprehensive performance breakdown on held-out test data.</p>

    <div class="metric-grid">
        <div class="card"><div class="title">Mean Absolute Error</div><div class="value">₹{overall_metrics['MAE']}</div></div>
        <div class="card"><div class="title">Root Mean Squared Error</div><div class="value">₹{overall_metrics['RMSE']}</div></div>
        <div class="card"><div class="title">R² Score</div><div class="value">{overall_metrics['R2']}</div></div>
        <div class="card"><div class="title">MAPE</div><div class="value">{overall_metrics['MAPE']}%</div></div>
    </div>

    <h2>Performance by Craft Category</h2>
    {category_df.to_html(classes="table", index=False)}

    <h2>Performance by Price Tier</h2>
    {tier_df.to_html(classes="table", index=False)}

    <h2>Top 5 Overpredictions (Predicted &gt; Actual)</h2>
    {top_over[['product_id', 'product_name', 'category', 'actual_price', 'predicted_price', 'error_inr', 'pct_error']].head(5).to_html(classes="table", index=False)}

    <h2>Top 5 Underpredictions (Predicted &lt; Actual)</h2>
    {top_under[['product_id', 'product_name', 'category', 'actual_price', 'predicted_price', 'error_inr', 'pct_error']].head(5).to_html(classes="table", index=False)}

    <h2>Summary Insights</h2>
    <ul>
        <li><strong>Mean Bias:</strong> ₹{summary['mean_error_bias']} (positive means slight over-prediction tendency on average)</li>
        <li><strong>Median Absolute Error:</strong> ₹{summary['median_abs_error']}</li>
        <li><strong>Error Std Dev:</strong> ₹{summary['error_std']}</li>
    </ul>
</body>
</html>"""

    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)
    logger.info(f"Saved HTML evaluation report to {html_path}")
