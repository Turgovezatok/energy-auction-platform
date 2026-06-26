# EnergyBid Forecast Engine v2 (15-Minute Model)

## Objective

Forecast Bulgarian Day-Ahead Market (IBEX/BNEB) electricity prices at 15-minute resolution.

Primary goals:

- Capture solar cannibalization.
- Capture evening duck-curve price spikes.
- Reduce forecast error compared to the hourly production model.
- Keep the existing hourly production model untouched until the new model proves superior.

---

# Project Structure

forecast_engine_v2/

├── data_import/
├── feature_engineering/
├── models/
│   ├── training/
│   └── prediction/
├── evaluation/
├── pipeline/
├── sql/
├── archive/
└── ARCHITECTURE.md

---

# Training Pipeline

Historical Sources

- energy_market_data_15m
- pv_generation_profile_15m
- solar_empirical_index_15m_v1
- solar_empirical_index_15m_v2
- solar_empirical_index_15m_v3
- solar_top30_weighted_index_hourly
- solar_weather_hourly
- holiday_calendar

Output:

forecast_features_15m

↓

CatBoost 15m model

---

# Runtime Pipeline

Forecast Sources

- ENTSO-E Day Ahead Prices
- ESO Load Forecast
- ENTSO-E Generation Forecast
- Weather Forecast
- Solar empirical lookup
- PV generation profile

↓

Runtime Features

↓

Price Forecast

---

# Feature Groups

1. Calendar Features
2. Market Features
3. Solar Features
4. System Features
5. Duck Curve Features

---

# Development Principles

- Never modify the production hourly model.
- Build v2 independently.
- Every feature must have a clear business or physical meaning.
- Prefer interpretable features over excessive complexity.
- Benchmark every new model against the production model before deployment.
