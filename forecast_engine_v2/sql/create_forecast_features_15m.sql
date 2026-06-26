create table if not exists forecast_features_15m (
  timestamp_utc timestamptz primary key,

  -- target
  dayahead_price numeric,

  -- calendar features
  hour int,
  quarter_hour int,
  weekday int,
  month int,
  season text,
  is_weekend boolean,
  is_holiday boolean,

  -- market lag features
  price_lag_15m numeric,
  price_lag_1h numeric,
  price_lag_24h numeric,
  price_avg_1h numeric,
  price_avg_4h numeric,
  price_avg_24h numeric,

  -- solar features
  pv_profile_kw numeric,
  solar_top30_index numeric,
  solar_empirical_v1 numeric,
  solar_empirical_v2 numeric,
  solar_empirical_v3 numeric,
  solar_empirical_final numeric,
  solar_generation_estimate numeric,

  -- system features
  eso_load_forecast_mw numeric,
  generation_forecast_mw numeric,
  residual_load_mw numeric,
  solar_penetration numeric,
  net_load_mw numeric,

  -- duck curve features
  solar_change_15m numeric,
  solar_change_1h numeric,
  load_change_1h numeric,
  net_load_change_1h numeric,
  duck_curve_ramp_1h numeric,
  duck_curve_ramp_3h numeric,

  created_at timestamptz default now()
);
