# Forecast Engine v2 - Data Dictionary

## Calendar Features

| Column | Description | Source |
|--------|-------------|--------|
| timestamp_utc | 15-minute UTC timestamp | energy_market_data_15m |
| hour | Hour of day (0-23) | Derived |
| quarter_hour | Quarter-hour index (0-95) | Derived |
| weekday | Day of week | Derived |
| month | Month (1-12) | Derived |
| season | Winter/Spring/Summer/Autumn | Derived |
| is_weekend | Weekend flag | Derived |
| is_holiday | Bulgarian public holiday | holiday_calendar |

## Market Features

| Column | Description | Source |
|--------|-------------|--------|
| dayahead_price | Target variable (EUR/MWh) | energy_market_data_15m |
| price_lag_15m | Previous 15-minute price | Derived |
| price_lag_1h | Price 1 hour ago | Derived |
| price_lag_24h | Price 24 hours ago | Derived |
| price_avg_1h | Rolling 1-hour average | Derived |
| price_avg_4h | Rolling 4-hour average | Derived |
| price_avg_24h | Rolling 24-hour average | Derived |

## Solar Features

| Column | Description | Source |
|--------|-------------|--------|
| pv_profile_kw | PV production profile | pv_generation_profile_15m |
| solar_top30_index | Top-30 PV weighted index | solar_top30_weighted_index_hourly |
| solar_empirical_final | Cascading empirical estimate | empirical lookup |

## System Features

| Column | Description | Source |
|--------|-------------|--------|
| eso_load_forecast_mw | ESO load forecast | eso_load_forecast_hourly |
| generation_forecast_mw | ENTSO-E generation forecast | entsoe_generation_forecast_hourly |
| residual_load_mw | Load minus generation | Derived |
| net_load_mw | Load minus solar generation | Derived |

## Duck Curve Features

| Column | Description | Source |
|--------|-------------|--------|
| solar_change_15m | Solar change over 15 min | Derived |
| solar_change_1h | Solar change over 1 hour | Derived |
| duck_curve_ramp_1h | Net-load ramp over 1 hour | Derived |
| duck_curve_ramp_3h | Net-load ramp over 3 hours | Derived |
