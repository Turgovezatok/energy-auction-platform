"""
Train XGBoost v1 model for Forecast Engine v2.

This script:
- builds 15-minute training features
- drops rows with missing values in selected features
- splits data chronologically into train/test
- trains XGBoost
- reports MAE, RMSE, MAPE
- prints feature importance
- saves the trained model
"""

import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error
from xgboost import XGBRegressor


CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = CURRENT_DIR.parents[0]
sys.path.append(str(PROJECT_DIR))

from feature_engineering.build_training_features_15m import (
    add_calendar_features,
    add_crossborder_exchange_features,
    add_eso_load_forecast_features,
    add_generation_forecast_features,
    add_market_period_features,
    add_price_features,
    add_solar_empirical_features,
    add_weather_forecast_features,
)
from feature_engineering.load_training_data import (
    load_crossborder_exchange_15m,
    load_eso_load_forecast_hourly,
    load_generation_forecast_hourly,
    load_market_15m,
    load_solar_empirical_index_15m_v3,
    load_weather_forecast_hourly,
)


MODEL_DIR = PROJECT_DIR / "models" / "training"
MODEL_PATH = MODEL_DIR / "xgboost_v1_15m.pkl"


FEATURE_COLUMNS = [
    "year",
    "month",
    "day",
    "hour",
    "quarter_hour",
    "quarter_hour_of_day",
    "weekday",
    "day_of_year",
    "week_of_year",
    "is_weekend",
    "price_lag_15m",
    "price_lag_1h",
    "price_lag_24h",
    "price_avg_1h",
    "price_avg_4h",
    "price_avg_24h",
    "is_night",
    "is_morning_ramp",
    "is_solar_hours",
    "is_evening_peak",
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
    "is_high_solar_radiation",
    "radiation_bucket",
    "temperature_bucket",
    "expected_solar_mw_avg",
    "expected_solar_mw_p50",
    "expected_solar_mw_p90",
    "solar_samples_count",
    "solar_uncertainty_mw",
]


TARGET_COLUMN = "dayahead_price"


def build_dataset() -> pd.DataFrame:
    df = load_market_15m()

    df = add_calendar_features(df)
    df = add_price_features(df)
    df = add_market_period_features(df)

    eso_load_df = load_eso_load_forecast_hourly()
    df = add_eso_load_forecast_features(df, eso_load_df)

    generation_df = load_generation_forecast_hourly()
    df = add_generation_forecast_features(df, generation_df)

    crossborder_df = load_crossborder_exchange_15m()
    df = add_crossborder_exchange_features(df, crossborder_df)

    weather_df = load_weather_forecast_hourly()
    df = add_weather_forecast_features(df, weather_df)

    solar_df = load_solar_empirical_index_15m_v3()
    df = add_solar_empirical_features(df, solar_df)

    df = df.sort_values("timestamp_utc").reset_index(drop=True)

    return df


def calculate_mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    mask = y_true != 0

    if mask.sum() == 0:
        return float("nan")

    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)


def main() -> None:
    print("\n=== Building training dataset ===")
    df = build_dataset()

    print(f"Raw rows: {len(df)}")
    print(f"Raw period: {df['timestamp_utc'].min()} -> {df['timestamp_utc'].max()}")

    required_columns = FEATURE_COLUMNS + [TARGET_COLUMN, "timestamp_utc"]

    missing_columns = [col for col in required_columns if col not in df.columns]
    if missing_columns:
        raise ValueError(f"Missing required columns: {missing_columns}")

    model_df = df[required_columns].copy()
    model_df = model_df.dropna().reset_index(drop=True)

    print(f"\nRows after dropna: {len(model_df)}")

    if len(model_df) < 100:
        raise ValueError("Not enough rows after dropna to train a model")

    print(
        "Training period after dropna:",
        model_df["timestamp_utc"].min(),
        "->",
        model_df["timestamp_utc"].max(),
    )

    split_index = int(len(model_df) * 0.8)

    train_df = model_df.iloc[:split_index].copy()
    test_df = model_df.iloc[split_index:].copy()

    X_train = train_df[FEATURE_COLUMNS]
    y_train = train_df[TARGET_COLUMN]

    X_test = test_df[FEATURE_COLUMNS]
    y_test = test_df[TARGET_COLUMN]

    print(f"\nTrain rows: {len(train_df)}")
    print(f"Test rows: {len(test_df)}")
    print(
        "Train period:",
        train_df["timestamp_utc"].min(),
        "->",
        train_df["timestamp_utc"].max(),
    )
    print(
        "Test period:",
        test_df["timestamp_utc"].min(),
        "->",
        test_df["timestamp_utc"].max(),
    )

    model = XGBRegressor(
        n_estimators=500,
        max_depth=4,
        learning_rate=0.03,
        subsample=0.85,
        colsample_bytree=0.85,
        objective="reg:squarederror",
        random_state=42,
        n_jobs=2,
    )

    print("\n=== Training XGBoost v1 ===")
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)

    mae = mean_absolute_error(y_test, predictions)
    rmse = float(np.sqrt(mean_squared_error(y_test, predictions)))
    mape = calculate_mape(y_test.to_numpy(), predictions)

    print("\n=== XGBoost v1 results ===")
    print(f"MAE: {mae:.2f} EUR/MWh")
    print(f"RMSE: {rmse:.2f} EUR/MWh")
    print(f"MAPE: {mape:.2f}%")

    result_df = test_df[["timestamp_utc", TARGET_COLUMN]].copy()
    result_df["prediction"] = predictions
    result_df["error"] = result_df["prediction"] - result_df[TARGET_COLUMN]
    result_df["abs_error"] = result_df["error"].abs()

    print("\nWorst 20 errors:")
    print(
        result_df
        .sort_values("abs_error", ascending=False)
        .head(20)
    )

    importance_df = pd.DataFrame(
        {
            "feature": FEATURE_COLUMNS,
            "importance": model.feature_importances_,
        }
    ).sort_values("importance", ascending=False)

    print("\nTop 30 feature importances:")
    print(importance_df.head(30))

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "model": model,
            "features": FEATURE_COLUMNS,
            "target": TARGET_COLUMN,
            "mae": mae,
            "rmse": rmse,
            "mape": mape,
        },
        MODEL_PATH,
    )

    print(f"\nModel saved to: {MODEL_PATH}")


if __name__ == "__main__":
    main()