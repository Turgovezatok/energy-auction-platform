"""
Diagnose Forecast Engine v2 runtime prediction inputs.

This script does NOT write forecasts to Supabase.

It inspects:
- model path and model bundle metadata;
- saved model feature columns;
- runtime data sources;
- runtime feature dataframe;
- missing and infinite values;
- feature order compatibility;
- prediction distribution;
- price lag features and fundamental inputs.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

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
    """
    Return the first existing production model path.
    """
    for path in MODEL_CANDIDATES:
        if path.exists():
            return path

    raise FileNotFoundError(
        "No XGBoost model found. Checked:\n"
        + "\n".join(str(path) for path in MODEL_CANDIDATES)
    )


def print_section(title: str) -> None:
    """
    Print a readable diagnostics section header.
    """
    print("\n" + "=" * 80)
    print(title)
    print("=" * 80)


def load_model_bundle(
    model_path: Path,
) -> tuple[Any, list[str], dict[str, Any]]:
    """
    Load the model file.

    The current EnergyBid model file is expected to contain a dictionary:

    {
        "model": XGBRegressor,
        "features": [...],
        "target": "...",
        "mae": ...,
        "rmse": ...,
        "mape": ...
    }

    Direct model objects are also supported.
    """
    loaded_object = joblib.load(model_path)

    if isinstance(loaded_object, dict):
        if "model" not in loaded_object:
            raise KeyError(
                "The model bundle is a dictionary, but it does not "
                "contain a 'model' key."
            )

        model = loaded_object["model"]

        raw_features = loaded_object.get("features", [])

        if raw_features is None:
            bundle_features: list[str] = []
        else:
            bundle_features = list(raw_features)

        metadata = {
            key: value
            for key, value in loaded_object.items()
            if key not in {"model", "features"}
        }

        return model, bundle_features, metadata

    return loaded_object, [], {}


def inspect_bundle(
    model_path: Path,
    model: Any,
    bundle_features: list[str],
    metadata: dict[str, Any],
) -> None:
    """
    Print model bundle information.
    """
    print_section("0. MODEL BUNDLE")

    print("Model path:", model_path)
    print("Model type:", type(model))
    print("Bundle feature count:", len(bundle_features))
    print("FEATURE_COLUMNS count:", len(FEATURE_COLUMNS))

    if bundle_features:
        print(
            "Bundle features match FEATURE_COLUMNS:",
            bundle_features == FEATURE_COLUMNS,
        )
    else:
        print(
            "Bundle does not contain a saved feature list."
        )

    if metadata:
        print("\nSaved bundle metadata:")

        for key, value in metadata.items():
            if isinstance(value, (str, int, float, np.number)):
                print(f"- {key}: {value}")
            else:
                print(f"- {key}: type={type(value)}")


def inspect_loaded_data(
    runtime_data: dict[str, pd.DataFrame],
) -> None:
    """
    Inspect every runtime data source loaded from Supabase.
    """
    print_section("1. RUNTIME DATA SOURCES")

    for name, df in runtime_data.items():
        print(f"\n{name}")
        print("-" * 60)
        print("Rows:", len(df))
        print("Columns:", df.columns.tolist())

        if df.empty:
            print("WARNING: Data source is empty.")
            continue

        timestamp_columns = [
            column
            for column in df.columns
            if "timestamp" in column.lower()
        ]

        if timestamp_columns:
            print("Timestamp coverage:")

            for column in timestamp_columns:
                print(
                    f"  {column}:",
                    df[column].min(),
                    "->",
                    df[column].max(),
                )

        print("\nLast two rows:")
        print(df.tail(2).to_string(index=False))


def print_feature_order_differences(
    bundle_features: list[str],
) -> None:
    """
    Print differences between saved bundle feature order
    and prediction/feature_columns.py.
    """
    if not bundle_features:
        return

    if bundle_features == FEATURE_COLUMNS:
        return

    print("\nFeature order differences:")
    print("-" * 80)

    max_length = max(
        len(bundle_features),
        len(FEATURE_COLUMNS),
    )

    for index in range(max_length):
        bundle_column = (
            bundle_features[index]
            if index < len(bundle_features)
            else "<missing>"
        )

        configured_column = (
            FEATURE_COLUMNS[index]
            if index < len(FEATURE_COLUMNS)
            else "<missing>"
        )

        if bundle_column != configured_column:
            print(
                f"{index + 1:02d}. "
                f"bundle={bundle_column} | "
                f"FEATURE_COLUMNS={configured_column}"
            )


def inspect_features(
    features_df: pd.DataFrame,
    model_features: list[str],
) -> pd.DataFrame:
    """
    Inspect runtime features and return the model input
    in the exact saved model feature order.
    """
    print_section("2. RUNTIME FEATURE DATAFRAME")

    print("Rows:", len(features_df))
    print("Columns:", len(features_df.columns))

    print("\nAll runtime columns:")

    for index, column in enumerate(
        features_df.columns,
        start=1,
    ):
        print(f"{index:02d}. {column}")

    missing_model_features = [
        column
        for column in model_features
        if column not in features_df.columns
    ]

    configured_missing_features = [
        column
        for column in FEATURE_COLUMNS
        if column not in features_df.columns
    ]

    unexpected_runtime_columns = [
        column
        for column in features_df.columns
        if column not in model_features
    ]

    print("\nSaved model feature count:", len(model_features))
    print(
        "Missing saved model features:",
        missing_model_features,
    )
    print(
        "Missing configured FEATURE_COLUMNS:",
        configured_missing_features,
    )
    print(
        "Additional runtime columns:",
        unexpected_runtime_columns,
    )

    if missing_model_features:
        raise RuntimeError(
            "Runtime dataframe is missing saved model features: "
            + ", ".join(missing_model_features)
        )

    model_input = features_df[model_features].copy()

    for column in model_features:
        model_input[column] = pd.to_numeric(
            model_input[column],
            errors="coerce",
        )

    numeric_array = model_input.to_numpy(dtype=float)

    infinity_counts = np.isinf(
        numeric_array
    ).sum(axis=0)

    infinity_by_column = {
        column: int(count)
        for column, count in zip(
            model_features,
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

    zero_counts = (
        model_input
        .eq(0)
        .sum()
        .sort_values(ascending=False)
    )

    print("\nMissing values by feature:")

    if (missing_counts > 0).any():
        print(
            missing_counts[
                missing_counts > 0
            ].to_string()
        )
    else:
        print("No missing values")

    print("\nInfinite values by feature:")

    if infinity_by_column:
        print(infinity_by_column)
    else:
        print("No infinite values")

    print("\nFeatures containing zero values:")

    if (zero_counts > 0).any():
        zero_report = pd.DataFrame(
            {
                "zero_rows": zero_counts,
                "zero_pct": (
                    zero_counts
                    / len(model_input)
                    * 100
                ).round(2),
            }
        )

        print(
            zero_report[
                zero_report["zero_rows"] > 0
            ].to_string()
        )
    else:
        print("No zero values")

    print("\nFeature descriptive statistics:")

    print(
        model_input
        .describe()
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
        "wind_speed_ms",
        "direct_radiation",
        "shortwave_radiation",
        "solar_radiation_total",
        "solar_radiation_ratio",
        "expected_solar_mw_avg",
        "expected_solar_mw_p50",
        "expected_solar_mw_p90",
        "solar_samples_count",
        "solar_uncertainty_mw",
    ]

    available_important_features = [
        column
        for column in important_features
        if column in model_input.columns
    ]

    print("\nImportant runtime feature sample:")

    if available_important_features:
        print(
            model_input[
                available_important_features
            ]
            .head(12)
            .round(4)
            .to_string(index=False)
        )
    else:
        print("No important diagnostic features were found.")

    return model_input


def inspect_model(
    model: Any,
    model_path: Path,
    model_input: pd.DataFrame,
    bundle_features: list[str],
) -> None:
    """
    Inspect model feature metadata and compatibility.
    """
    print_section("3. MODEL INSPECTION")

    print("Model path:", model_path)
    print("Model type:", type(model))
    print("Model input shape:", model_input.shape)
    print("Bundle feature count:", len(bundle_features))
    print("FEATURE_COLUMNS count:", len(FEATURE_COLUMNS))

    if bundle_features:
        print(
            "Bundle feature order matches FEATURE_COLUMNS:",
            bundle_features == FEATURE_COLUMNS,
        )

        print(
            "Model input columns match bundle feature order:",
            model_input.columns.tolist()
            == bundle_features,
        )

        print_feature_order_differences(
            bundle_features
        )

    model_feature_names: list[str] | None = None

    if hasattr(model, "feature_names_in_"):
        model_feature_names = list(
            model.feature_names_in_
        )

        print(
            "Model feature_names_in_ count:",
            len(model_feature_names),
        )

        print(
            "Model feature_names_in_ match model input:",
            model_feature_names
            == model_input.columns.tolist(),
        )

    elif hasattr(model, "get_booster"):
        booster = model.get_booster()

        if booster.feature_names:
            model_feature_names = list(
                booster.feature_names
            )

            print(
                "Booster feature count:",
                len(model_feature_names),
            )

            print(
                "Booster features match model input:",
                model_feature_names
                == model_input.columns.tolist(),
            )
        else:
            print(
                "The XGBoost booster does not expose feature names."
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

        if model.n_features_in_ != model_input.shape[1]:
            raise RuntimeError(
                "Model feature count does not match "
                "runtime model input feature count."
            )


def inspect_predictions(
    model: Any,
    model_input: pd.DataFrame,
    features_df: pd.DataFrame,
) -> None:
    """
    Run prediction diagnostics without writing results.
    """
    print_section("4. PREDICTION DIAGNOSTICS")

    missing_before_fill = int(
        model_input.isna().sum().sum()
    )

    infinite_before_fill = int(
        np.isinf(
            model_input.to_numpy(dtype=float)
        ).sum()
    )

    print(
        "Missing model-input cells before fill:",
        missing_before_fill,
    )

    print(
        "Infinite model-input cells before fill:",
        infinite_before_fill,
    )

    clean_input = (
        model_input
        .replace([np.inf, -np.inf], np.nan)
        .fillna(0)
    )

    predictions = model.predict(clean_input)
    predictions = np.asarray(
        predictions,
        dtype=float,
    )

    print("Prediction count:", len(predictions))
    print(
        "Prediction mean:",
        round(float(predictions.mean()), 4),
    )
    print(
        "Prediction median:",
        round(float(np.median(predictions)), 4),
    )
    print(
        "Prediction minimum:",
        round(float(predictions.min()), 4),
    )
    print(
        "Prediction maximum:",
        round(float(predictions.max()), 4),
    )
    print(
        "Prediction standard deviation:",
        round(float(predictions.std()), 4),
    )

    timestamp_column: str | None = None

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
        result
        .head(20)
        .round({"predicted_price": 2})
        .to_string(index=False)
    )

    print("\nLast 20 diagnostic predictions:")

    print(
        result
        .tail(20)
        .round({"predicted_price": 2})
        .to_string(index=False)
    )

    predictions_below_zero = int(
        (predictions < 0).sum()
    )

    predictions_below_30 = int(
        (predictions < 30).sum()
    )

    predictions_above_300 = int(
        (predictions > 300).sum()
    )

    print(
        "\nPredictions below 0 EUR/MWh:",
        predictions_below_zero,
    )

    print(
        "Predictions below 30 EUR/MWh:",
        predictions_below_30,
    )

    print(
        "Predictions above 300 EUR/MWh:",
        predictions_above_300,
    )


def main() -> None:
    """
    Execute all diagnostics.
    """
    print_section(
        "ENERGYBID FORECAST ENGINE V2 DIAGNOSTICS"
    )

    print(
        "Forecast engine directory:",
        FORECAST_ENGINE_DIR,
    )

    print(
        "Configured FEATURE_COLUMNS count:",
        len(FEATURE_COLUMNS),
    )

    model_path = find_model_path()

    (
        model,
        bundle_features,
        bundle_metadata,
    ) = load_model_bundle(model_path)

    inspect_bundle(
        model_path=model_path,
        model=model,
        bundle_features=bundle_features,
        metadata=bundle_metadata,
    )

    model_features = (
        bundle_features
        if bundle_features
        else list(FEATURE_COLUMNS)
    )

    runtime_data = load_all_runtime_data()

    inspect_loaded_data(runtime_data)

    features_df = build_runtime_features(
        runtime_data
    )

    if features_df.empty:
        raise RuntimeError(
            "build_runtime_features returned "
            "an empty dataframe."
        )

    model_input = inspect_features(
        features_df=features_df,
        model_features=model_features,
    )

    inspect_model(
        model=model,
        model_path=model_path,
        model_input=model_input,
        bundle_features=bundle_features,
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