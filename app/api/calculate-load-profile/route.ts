create table if not exists public.invoice_load_profiles (
  id uuid primary key default gen_random_uuid(),

  invoice_id uuid references public.invoice_uploads(id) on delete cascade,

  total_consumption_kwh numeric,
  total_consumption_mwh numeric,

  day_consumption_kwh numeric,
  night_consumption_kwh numeric,
  peak_consumption_kwh numeric,
  offpeak_consumption_kwh numeric,

  day_share numeric,
  night_share numeric,
  peak_share numeric,
  offpeak_share numeric,

  billing_days integer,
  day_hours integer,
  night_hours integer,
  peak_hours integer,
  offpeak_hours integer,

  avg_total_load_kw numeric,
  avg_day_load_kw numeric,
  avg_night_load_kw numeric,
  avg_peak_load_kw numeric,
  avg_offpeak_load_kw numeric,

  day_night_load_ratio numeric,
  peak_offpeak_load_ratio numeric,

  baseload_kw numeric,
  max_estimated_load_kw numeric,

  profile_type text,
  profile_quality text,
  risk_level text,

  notes text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
