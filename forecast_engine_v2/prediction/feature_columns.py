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