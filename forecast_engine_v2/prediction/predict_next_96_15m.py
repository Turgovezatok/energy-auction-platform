"""
Production prediction script for Forecast Engine v2.

Flow:
- load trained XGBoost model bundle
- load latest runtime data
- build next 96 x 15-minute runtime features
- predict prices
- create forecast run
- insert 96 forecast rows
- mark run completed / failed
"""

import sys
from pathlib import Path

import joblib
from supabase import create_client


CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = CURRENT_DIR.parents[0]
sys.path.append(str(PROJECT_DIR))
sys.path.append(str(CURRENT_DIR))


from config.settings import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from feature_columns import FEATURE_COLUMNS
from runtime_data_loader import load_all_runtime_data
from runtime_features import build_runtime_features
from forecast_writer import (
    create_forecast_run,
    complete_forecast_run,
    fail_forecast_run,
    build_forecast_result_rows,
    insert_forecast_results,
)


MODEL_PATH = PROJECT_DIR / "models" / "training" / "xgboost_v1_15m.pkl"


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

    if not isinstance(bundle, dict):
        raise ValueError("Model file must contain a dict bundle")

    if "model" not in bundle:
        raise ValueError("Model bundle missing key: model")

    if "features" not in bundle:
        raise ValueError("Model bundle missing key: features")

    return bundle


def validate_feature_columns(model_features):
    if list(model_features) != list(FEATURE_COLUMNS):
        missing_in_runtime = [c for c in model_features if c not in FEATURE_COLUMNS]
        extra_in_runtime = [c for c in FEATURE_COLUMNS if c not in model_features]

        raise ValueError(
            "Feature mismatch between model bundle and runtime FEATURE_COLUMNS. "
            f"Missing in runtime: {missing_in_runtime}. "
            f"Extra in runtime: {extra_in_runtime}."
        )


def main():
    print("\n=== Forecast Engine v2 production prediction run ===")
    print(f"Model path: {MODEL_PATH}")

    supabase = get_supabase_client()
    forecast_run_id = None

    try:
        bundle = load_model_bundle()
        model = bundle["model"]
        model_features = bundle["features"]

        print("\nModel loaded successfully.")
        print(f"Features count: {len(model_features)}")
        print(f"Training MAE: {bundle.get('mae')}")
        print(f"Training RMSE: {bundle.get('rmse')}")

        validate_feature_columns(model_features)

        print("\nLoading runtime data...")
        runtime_data = load_all_runtime_data()

        print("Building runtime features...")
        features_df = build_runtime_features(runtime_data, periods=96)

        if len(features_df) != 96:
            raise ValueError(f"Expected 96 feature rows, got {len(features_df)}")

        X = features_df[FEATURE_COLUMNS]

        print("Running model prediction...")
        predictions = model.predict(X)

        if len(predictions) != 96:
            raise ValueError(f"Expected 96 predictions, got {len(predictions)}")

        print("Creating forecast run...")
        forecast_run_id, forecast_date, run_number = create_forecast_run(supabase)

        print(f"Forecast date: {forecast_date}")
        print(f"Run number: {run_number}")
        print(f"Forecast run id: {forecast_run_id}")

        rows = build_forecast_result_rows(
            forecast_run_id=forecast_run_id,
            forecast_date=forecast_date,
            run_number=run_number,
            features_df=features_df,
            predictions=predictions,
        )

        print("Inserting forecast result rows...")
        inserted_rows = insert_forecast_results(supabase, rows)

        print(f"Inserted rows: {len(inserted_rows)}")

        complete_forecast_run(supabase, forecast_run_id)

        print("\n✅ Forecast completed successfully.")
        print(f"Run number: {run_number}")
        print(f"Rows predicted: {len(predictions)}")

        print("\nPrediction sample:")
        for i in range(min(10, len(predictions))):
            ts = features_df.iloc[i]["timestamp_utc"]
            price = float(predictions[i])
            print(f"{i + 1:02d} | {ts} | {price:.2f} EUR/MWh")

    except Exception as exc:
        print(f"\n❌ Forecast failed: {exc}")

        if forecast_run_id:
            fail_forecast_run(supabase, forecast_run_id, str(exc))

        raise


if __name__ == "__main__":
    main()