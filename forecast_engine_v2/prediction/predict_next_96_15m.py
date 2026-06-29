"""
Predict next 96 x 15-minute intervals for Forecast Engine v2.

Step 3:
- load trained XGBoost model
- generate next 96 target timestamps
- print target horizon
"""

import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd
from supabase import create_client


CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = CURRENT_DIR.parents[0]
sys.path.append(str(PROJECT_DIR))

from config.settings import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY


MODEL_PATH = PROJECT_DIR / "models" / "training" / "xgboost_v1_15m.pkl"

MODEL_NAME = "xgboost_v1_15m"
MODEL_VERSION = "v1"


def get_supabase_client():
    if not SUPABASE_URL:
        raise ValueError("Missing environment variable: SUPABASE_URL")

    if not SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("Missing environment variable: SUPABASE_SERVICE_ROLE_KEY")

    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def load_model_bundle():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")

    bundle = joblib.load(MODEL_PATH)

    if "model" not in bundle:
        raise ValueError("Model bundle missing key: model")

    if "features" not in bundle:
        raise ValueError("Model bundle missing key: features")

    return bundle


def get_next_run_number(supabase, forecast_date: str) -> int:
    response = (
        supabase
        .table("forecast_runs_15m")
        .select("run_number")
        .eq("forecast_date", forecast_date)
        .eq("model_name", MODEL_NAME)
        .order("run_number", desc=True)
        .limit(1)
        .execute()
    )

    rows = response.data or []

    if not rows:
        return 1

    last_run_number = int(rows[0]["run_number"])

    if last_run_number >= 9:
        raise ValueError(f"All 9 forecast runs already exist for {forecast_date}")

    return last_run_number + 1


def create_forecast_run(supabase, forecast_date: str, run_number: int) -> str:
    response = (
        supabase
        .table("forecast_runs_15m")
        .insert({
            "forecast_date": forecast_date,
            "run_number": run_number,
            "model_name": MODEL_NAME,
            "model_version": MODEL_VERSION,
            "horizon_intervals": 96,
            "status": "started",
        })
        .execute()
    )

    rows = response.data or []

    if not rows:
        raise ValueError("Failed to create forecast run")

    return rows[0]["id"]


def complete_forecast_run(supabase, forecast_run_id: str) -> None:
    (
        supabase
        .table("forecast_runs_15m")
        .update({
            "status": "completed",
        })
        .eq("id", forecast_run_id)
        .execute()
    )


def build_target_timestamps() -> pd.DataFrame:
    """
    Build the next 96 forecast timestamps, starting from the next 15-minute boundary.
    """
    now_utc = pd.Timestamp.now(tz="UTC")
    first_target = now_utc.ceil("15min")

    timestamps = pd.date_range(
        start=first_target,
        periods=96,
        freq="15min",
        tz="UTC",
    )

    return pd.DataFrame({
        "target_timestamp_utc": timestamps,
        "horizon_step": range(1, 97),
    })


def main() -> None:
    print("\n=== Forecast Engine v2 prediction run ===")
    print(f"Model path: {MODEL_PATH}")

    bundle = load_model_bundle()

    print("\nModel loaded successfully.")
    print(f"Features count: {len(bundle['features'])}")
    print(f"Training MAE: {bundle.get('mae')}")
    print(f"Training RMSE: {bundle.get('rmse')}")

    supabase = get_supabase_client()

    forecast_date = datetime.now(timezone.utc).date().isoformat()
    run_number = get_next_run_number(supabase, forecast_date)

    print(f"\nForecast date: {forecast_date}")
    print(f"Run number: {run_number}")

    target_df = build_target_timestamps()

    print("\nTarget timestamps:")
    print(target_df.head(10))
    print("...")
    print(target_df.tail(10))
    print(f"\nTarget rows: {len(target_df)}")


if __name__ == "__main__":
    main()