"""
Diagnose Forecast Engine v2 runtime prediction inputs.

This script does NOT write forecasts to Supabase.
It inspects:
- model path and model metadata;
- expected feature columns;
- runtime feature dataframe;
- missing and infinite values;
- feature order;
- prediction distribution;
- price lag features and market history.
"""

from __future__ import annotations

import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd


CURRENT_DIR = Path(__file__).resolve().parent
FORECAST_ENGINE_DIR = CURRENT_DIR.parent
PROJECT_ROOT = FORECAST_ENGINE_DIR.parent

sys.path.insert(0, str(FORECAST_ENGINE_DIR))
sys.path.insert(0, str(PROJECT_ROOT))


from prediction.feature_columns import FEATURE_COLUMNS
from prediction.runtime_data_loader import load_all_runtime_data
from prediction.runtime_features import build_runtime_features


MODEL_CANDIDATES = [
    FORECAST_ENGINE_DIR
    / "models"
    / "training"
    / "xgboost_v1_15m.pkl",

    FORECAST_ENGINE_DIR
    / "models"
    / "prediction"
    / "xgboost_v1_15m.pkl",

    FORECAST_ENGINE_DIR
    / "models"
    / "xgboost_v1_15m.pkl",
]


def find_model_path() -> Path:
    for path in MODEL_CANDIDATES:
        if path.exists():
            return path

    raise FileNotFoundError(
        "No XGBoost model found. Checked:\n"
        + "\n".join(str(path) for path in MODEL_CANDIDATES)
    )


def print_section(title: str) -> None:
    print("\n" + "=" * 80)
    print(title)
    print("=" * 80)


def inspect_loaded_data(
    runtime_data: dict[str, pd.DataFrame],
) -> None:
    print_section("1. RUNTIME DATA SOURCES")

    for name, df in runtime_data.items():
        print(f"\n{name}")
        print("-" * 60)
        print("Rows:", len(df))
        print("Columns:", df.columns.tolist())

        if not df.empty:
            print("First timestamp:")
            timestamp_columns = [
                column
                for column in df.columns
                if "timestamp" in column.lower()
            ]

            for column in timestamp_columns:
                print(
                    f"  {column}:",
                    df[column].min(),
                    "->",
                    df[column].max(),
                )

            print("\nLast two rows:")
            print(df.tail(2).to_string(index=False))


def inspect_features(
    features_df: pd.DataFrame,
) -> pd.DataFrame:
    print_section("2. RUNTIME FEATURE DATAFRAME")

    print("Rows:", len(features_df))
    print("Columns:", len(features_df.columns))

    print("\nAll runtime columns:")
    for index, column in enumerate(
        features_df.columns,
        start=1,
    ):
        print(f"{index:02d}. {column}")

    missing_expected = [
        column
        for column in FEATURE_COLUMNS
        if column not in features_df.columns
    ]

    unexpected_columns = [
        column
        for column in features_df.columns
        if column not in FEATURE_COLUMNS
    ]

    print("\nExpected model features:", len(FEATURE_COLUMNS))
    print("Missing expected features:", missing_expected)
    print("Unexpected runtime columns:", unexpected_columns)

    if missing_expected:
        raise RuntimeError(
            "Runtime dataframe is missing model features: "
            + ", ".join(missing_expected)
        )

    model_input = features_df[FEATURE_COLUMNS].copy()

    for column in FEATURE_COLUMNS:
        model_input[column] = pd.to_numeric(
            model_input[column],
            errors="coerce",
        )

    infinity_counts = (
        np.isinf(model_input.to_numpy(dtype=float))
        .sum(axis=0)
    )

    infinity_by_column = {
        column: int(count)
        for column, count in zip(
            FEATURE_COLUMNS,
            infinity_counts,
        )
        if count > 0
    }

    missing_counts = (
        model_input
        .isna()
        .sum()
        .sort_values(ascending=False)
    )

    print("\nMissing values by feature:")
    print(
        missing_counts[
            missing_counts > 0
        ].to_string()
        if (missing_counts > 0).any()
        else "No missing values"
    )

    print("\nInfinite values by feature:")
    print(
        infinity_by_column
        if infinity_by_column
        else "No infinite values"
    )

    print("\nFeature descriptive statistics:")
    print(
        model_input.describe()
        .transpose()[
            ["mean", "std", "min", "max"]
        ]
        .round(4)
        .to_string()
    )

    important_features = [
        "price_lag_15m",
        "price_lag_1h",
        "price_lag_24h",
        "price_avg_1h",
        "price_avg_4h",
        "price_avg_24h",
        "eso_load_forecast_mw",
        "generation_forecast_mw",
        "generation_margin_mw",
        "generation_to_load_ratio",
        "scheduled_import_mw",
        "scheduled_export_mw",
        "net_import_mw",
        "temperature_c",
        "shortwave_radiation",
        "expected_solar_mw_avg",
        "expected_solar_mw_p50",
        "expected_solar_mw_p90",
    ]

    available_important = [
        column
        for column in important_features
        if column in model_input.columns
    ]

    print("\nImportant runtime feature sample:")
    print(
        model_input[
            available_important
        ].head(12).round(4).to_string(index=False)
    )

    return model_input


def inspect_model(
    model: object,
    model_path: Path,
    model_input: pd.DataFrame,
) -> None:
    print_section("3. MODEL INSPECTION")

    print("Model path:", model_path)
    print("Model type:", type(model))
    print("Model input shape:", model_input.shape)

    model_feature_names = None

    if hasattr(model, "feature_names_in_"):
        model_feature_names = list(
            model.feature_names_in_
        )

        print(
            "Model feature_names_in_ count:",
            len(model_feature_names),
        )

        order_matches = (
            model_feature_names
            == FEATURE_COLUMNS
        )

        print(
            "Feature order matches FEATURE_COLUMNS:",
            order_matches,
        )

        if not order_matches:
            print("\nModel feature order:")
            for index, column in enumerate(
                model_feature_names,
                start=1,
            ):
                expected = (
                    FEATURE_COLUMNS[index - 1]
                    if index <= len(FEATURE_COLUMNS)
                    else None
                )

                marker = (
                    "OK"
                    if column == expected
                    else f"EXPECTED {expected}"
                )

                print(
                    f"{index:02d}. {column} -> {marker}"
                )

    elif hasattr(model, "get_booster"):
        booster = model.get_booster()
        model_feature_names = booster.feature_names

        print(
            "Booster feature names:",
            model_feature_names,
        )

    else:
        print(
            "Model does not expose saved feature names."
        )

    if hasattr(model, "n_features_in_"):
        print(
            "Model n_features_in_:",
            model.n_features_in_,
        )

    print(
        "FEATURE_COLUMNS count:",
        len(FEATURE_COLUMNS),
    )


def inspect_predictions(
    model: object,
    model_input: pd.DataFrame,
    features_df: pd.DataFrame,
) -> None:
    print_section("4. PREDICTION DIAGNOSTICS")

    clean_input = (
        model_input
        .replace([np.inf, -np.inf], np.nan)
        .fillna(0)
    )

    predictions = model.predict(clean_input)
    predictions = np.asarray(predictions, dtype=float)

    print("Prediction count:", len(predictions))
    print("Prediction mean:", round(float(predictions.mean()), 4))
    print("Prediction median:", round(float(np.median(predictions)), 4))
    print("Prediction minimum:", round(float(predictions.min()), 4))
    print("Prediction maximum:", round(float(predictions.max()), 4))
    print("Prediction std:", round(float(predictions.std()), 4))

    timestamp_column = None

    for candidate in [
        "target_timestamp_utc",
        "timestamp_utc",
    ]:
        if candidate in features_df.columns:
            timestamp_column = candidate
            break

    result = pd.DataFrame(
        {
            "predicted_price": predictions,
        }
    )

    if timestamp_column:
        result.insert(
            0,
            timestamp_column,
            features_df[
                timestamp_column
            ].reset_index(drop=True),
        )

    print("\nFirst 20 diagnostic predictions:")
    print(
        result.head(20)
        .round({"predicted_price": 2})
        .to_string(index=False)
    )

    print("\nLast 20 diagnostic predictions:")
    print(
        result.tail(20)
        .round({"predicted_price": 2})
        .to_string(index=False)
    )

    suspicious_low = int(
        (predictions < 30).sum()
    )
    suspicious_high = int(
        (predictions > 300).sum()
    )

    print("\nPredictions below 30 EUR/MWh:", suspicious_low)
    print("Predictions above 300 EUR/MWh:", suspicious_high)


def main() -> None:
    print_section(
        "ENERGYBID FORECAST ENGINE V2 DIAGNOSTICS"
    )

    print("Forecast engine directory:", FORECAST_ENGINE_DIR)
    print("Expected feature count:", len(FEATURE_COLUMNS))

    model_path = find_model_path()
    model = joblib.load(model_path)

    runtime_data = load_all_runtime_data()
    inspect_loaded_data(runtime_data)

    features_df = build_runtime_features(
        runtime_data
    )

    if features_df.empty:
        raise RuntimeError(
            "build_runtime_features returned an empty dataframe"
        )

    model_input = inspect_features(features_df)

    inspect_model(
        model=model,
        model_path=model_path,
        model_input=model_input,
    )

    inspect_predictions(
        model=model,
        model_input=model_input,
        features_df=features_df,
    )

    print_section("DIAGNOSTICS COMPLETED")
    print(
        "No forecasts were written to Supabase."
    )


if __name__ == "__main__":
    try:
        main()

    except Exception as exc:
        print(
            f"\nDIAGNOSTIC ERROR: {exc}",
            file=sys.stderr,
        )
        sys.exit(1)