"""
Predict next 96 x 15-minute intervals for Forecast Engine v2.

Step 1:
- load trained XGBoost model
- verify model metadata
"""

import sys
from pathlib import Path

import joblib


CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = CURRENT_DIR.parents[0]
sys.path.append(str(PROJECT_DIR))


MODEL_PATH = PROJECT_DIR / "models" / "training" / "xgboost_v1_15m.pkl"


def load_model_bundle():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")

    bundle = joblib.load(MODEL_PATH)

    if "model" not in bundle:
        raise ValueError("Model bundle missing key: model")

    if "features" not in bundle:
        raise ValueError("Model bundle missing key: features")

    return bundle


def main() -> None:
    print("\n=== Forecast Engine v2 prediction test ===")
    print(f"Model path: {MODEL_PATH}")

    bundle = load_model_bundle()

    print("\nModel loaded successfully.")
    print(f"Features count: {len(bundle['features'])}")
    print(f"Training MAE: {bundle.get('mae')}")
    print(f"Training RMSE: {bundle.get('rmse')}")
    print(f"Training MAPE: {bundle.get('mape')}")


if __name__ == "__main__":
    main()