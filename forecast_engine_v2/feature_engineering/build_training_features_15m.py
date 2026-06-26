cat > forecast_engine_v2/feature_engineering/build_training_features_15m.py <<'EOF'
"""
Build basic calendar features for Forecast Engine v2.
"""

import sys
from pathlib import Path

import pandas as pd

CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = CURRENT_DIR.parents[0]
sys.path.append(str(PROJECT_DIR))

from feature_engineering.load_training_data import load_market_15m


def add_calendar_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    ts = df["timestamp_utc"]

    df["year"] = ts.dt.year
    df["month"] = ts.dt.month
    df["day"] = ts.dt.day
    df["hour"] = ts.dt.hour

    # Quarter-hour inside the hour: 0, 1, 2, 3
    df["quarter_hour"] = ts.dt.minute // 15

    # Quarter-hour index inside the day: 0-95
    df["quarter_hour_of_day"] = df["hour"] * 4 + df["quarter_hour"]

    df["weekday"] = ts.dt.weekday
    df["day_of_year"] = ts.dt.dayofyear
    df["week_of_year"] = ts.dt.isocalendar().week.astype(int)

    df["is_weekend"] = df["weekday"].isin([5, 6]).astype(int)

    return df


if __name__ == "__main__":
    df = load_market_15m()
    df = add_calendar_features(df)

    print(df.head())

    print("\nColumns:")
    print(df.columns.tolist())

    print("\nRows:")
    print(len(df))
EOF