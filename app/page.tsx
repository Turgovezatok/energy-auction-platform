import type { CSSProperties } from "react";

type ForecastRow = {
  timestamp_utc: string;
  timestamp_bg?: string;
  forecast_price_eur_mwh: number;
  actual_price_eur_mwh?: number | null;
  absolute_error_eur_mwh?: number | null;
  absolute_error_pct?: number | null;
  created_at?: string;
};

type ForecastPayload = {
  rows: ForecastRow[];
  updatedAt: string | null;
  modelName: string | null;
};

type MarketExpectations = {
  year: number;
  month: number;
  eex_trade_date: string;
  quarter_contract: string;
  eex_quarter_price: number;
  year_contract: string;
  eex_year_price: number;
  historical_base_price: number;
  solar_capture_price: number;
  solar_capture_rate_pct: number;
  evening_market_price: number;
  day_market_price: number;
  night_market_price: number;
  solar_battery_uplift_eur_mwh: number;
  standalone_battery_premium_eur_mwh: number;
  battery_opportunity_level: string;
  solar_cannibalization_index: number;
  intraday_volume_ratio_pct: number;
  has_negative_price: boolean;
  battery_arbitrage_signal_eur_mwh: number;
};

async function getLatestForecast(): Promise<ForecastPayload> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { rows: [], updatedAt: null, modelName: null };
  }

  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  };

  try {
    // 1. Fetch the latest run info
    const latestRunRes = await fetch(
      `${supabaseUrl}/rest/v1/price_forecast_results?select=forecast_run_id,created_at&order=created_at.desc&limit=1`,
      { headers, cache: "no-store" }
    );

    if (!latestRunRes.ok) {
      return { rows: [], updatedAt: null, modelName: null };
    }

    const latestRun = await latestRunRes.json();
    const forecastRunId = latestRun?.[0]?.forecast_run_id;
    const fallbackUpdatedAt = latestRun?.[0]?.created_at ?? null;

    if (!forecastRunId) {
      return { rows: [], updatedAt: fallbackUpdatedAt, modelName: null };
    }

    // 2. Fetch the latest view results
    const dataRes = await fetch(
      `${supabaseUrl}/rest/v1/vw_forecast_vs_actual_latest?select=timestamp_utc,timestamp_bg,forecast_price_eur_mwh,actual_price_eur_mwh,absolute_error_eur_mwh,absolute_error_pct,created_at&order=timestamp_utc.asc`,
      { headers, cache: "no-store" }
    );

    if (!dataRes.ok) {
      return { rows: [], updatedAt: fallbackUpdatedAt, modelName: null };
    }

    const rows = await dataRes.json();

    return {
      rows,
      updatedAt: rows?.[0]?.created_at ?? fallbackUpdatedAt,
      modelName: null,
    };
  } catch (error) {
    console.error("Failed to fetch forecast details:", error);
    return { rows: [], updatedAt: null, modelName: null };
  }
}

async function getMarketExpectations(): Promise<MarketExpectations | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  };

  const res = await fetch(
    `${supabaseUrl}/rest/v1/vw_market_expectations?select=*&limit=1`,
    { headers, cache: "no-store" }
  );

  if (!res.ok) return null;

  const data = await res.json();
  return data?.[0] ?? null;
}

function formatNumber(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  return Number(value).toFixed(digits);
}

function formatDate(dateValue: string | null | undefined) {
  if (!dateValue) return "—";

  return new Date(dateValue).toLocaleDateString("bg-BG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateLong(dateValue: string | null | undefined) {
  if (!dateValue) return "—";

  return new Date(dateValue).toLocaleDateString("bg-BG", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Sofia",
  });
}

function formatDateTime(dateValue: string | null | undefined) {
  if (!dateValue) return "—";

  return new Date(dateValue).toLocaleString("bg-BG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Sofia",
  });
}

function MarketIntelligence({ data }: { data: MarketExpectations | null }) {
  if (!data) {
    return (
      <section style={marketSectionStyle}>
        <h2 style={marketTitleStyle}>Market Intelligence</h2>
        <p style={{ color: "#64748b" }}>
          Все още няма налични пазарни очаквания.
        </p>
      </section>
    );
  }

  const periodLabel = `${String(data.month).padStart(2, "0")}.${data.year}`;

  const cards = [
    {
      icon: "⚡",
      label: `EEX ${data.quarter_contract}`,
      value: `${formatNumber(data.eex_quarter_price, 2)} €/MWh`,
      period: `Период: ${data.quarter_contract}`,
      source: `Източник: EEX Futures · ${formatDate(data.eex_trade_date)}`,
    },
    {
      icon: "📅",
      label: `EEX ${data.year_contract}`,
      value: `${formatNumber(data.eex_year_price, 2)} €/MWh`,
      period: `Период: ${data.year_contract}`,
      source: `Източник: EEX Futures · ${formatDate(data.eex_trade_date)}`,
    },
    {
      icon: "☀️",
      label: "Solar Capture Price",
      value: `${formatNumber(data.solar_capture_price, 1)} €/MWh`,
      period: `Период: ${periodLabel}`,
      source: "Източник: Technology Capture Analytics",
    },
    {
      icon: "🔋",
      label: "Battery Uplift vs Solar",
      value: `+${formatNumber(data.solar_battery_uplift_eur_mwh, 1)} €/MWh`,
      period: `Период: ${periodLabel}`,
      source: "Източник: Technology Economics",
    },
  ];

  return (
    <section style={marketSectionStyle}>
      <div style={marketHeaderStyle}>
        <div>
          <div style={badgeStyle}>Market Expectations</div>
          <h2 style={marketTitleStyle}>Forward Economics</h2>
          <p style={marketSubtitleStyle}>
            Комбинация от EEX BG Futures, исторически базов товар, capture
            analytics и стойност на батерия зад ФЕЦ.
          </p>
        </div>

        <a href="/statistics" style={marketButtonDarkStyle}>
          Open Statistics
        </a>
      </div>

      <div style={marketCardGridStyle}>
        {cards.map((card) => (
          <div key={card.label} style={marketCardStyle}>
            <div style={marketIconStyle}>{card.icon}</div>
            <span style={marketCardLabelStyle}>{card.label}</span>
            <strong style={marketCardValueStyle}>{card.value}</strong>
            <p style={marketCardNoteStyle}>{card.period}</p>
            <p style={marketCardSourceStyle}>{card.source}</p>
          </div>
        ))}
      </div>

      <div style={marketSignalGridStyle}>
        <div style={marketSignalStyle}>
          <span>Battery Opportunity</span>
          <strong>{data.battery_opportunity_level}</strong>
          <small>Период: последен IBEX месечен доклад</small>
          <small>Източник: IBEX Market Intelligence</small>
        </div>

        <div style={marketSignalStyle}>
          <span>Solar Cannibalization Index</span>
          <strong>{formatNumber(data.solar_cannibalization_index, 2)}</strong>
          <small>Период: последен IBEX месечен доклад</small>
          <small>Източник: IBEX Market Intelligence</small>
        </div>

        <div style={marketSignalStyle}>
          <span>Standalone Battery Premium</span>
          <strong>
            +{formatNumber(data.standalone_battery_premium_eur_mwh, 1)} €/MWh
          </strong>
          <small>Период: {periodLabel}</small>
          <small>Източник: Technology Economics</small>
        </div>
      </div>
    </section>
  );
}

function ForecastChart({
  data,
  updatedAt,
  modelName,
}: {
  data: ForecastRow[];
  updatedAt: string | null;
  modelName: string | null;
}) {
  if (!data.length) {
    return (
      <section style={forecastSectionStyle}>
        <h2 style={forecastTitleStyle}>Tomorrow Electricity Price Forecast</h2>
        <p style={{ color: "#64748b" }}>Все още няма записана прогноза.</p>
      </section>
    );
  }

  const prices = data.map((d) => Number(d.forecast_price_eur_mwh));
  const minRaw = Math.min(...prices);
  const maxRaw = Math.max(...prices);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

  const forecastDate = formatDateLong(data[0]?.timestamp_utc);
  const updatedAtLabel = formatDateTime(updatedAt);

  const yMin = Math.floor((minRaw - 10) / 10) * 10;
  const yMax = Math.ceil((maxRaw + 10) / 10) * 10;

  const width = 1100;
  const height = 380;
  const paddingLeft = 78;
  const paddingRight = 30;
  const paddingTop = 28;
  const paddingBottom = 46;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  function getX(index: number) {
    return paddingLeft + (index / (data.length - 1)) * chartWidth;
  }

  function getY(price: number) {
    return paddingTop + ((yMax - price) / (yMax - yMin || 1)) * chartHeight;
  }

  const points = data
    .map((d, index) => `${getX(index)},${getY(Number(d.forecast_price_eur_mwh))}`)
    .join(" ");

  const yTicks = Array.from({ length: 5 }).map((_, i) => {
    return yMin + i * ((yMax - yMin) / 4);
  });

  return (
    <section style={forecastSectionStyle}>
      <div style={forecastHeaderStyle}>
        <div>
          <div style={badgeStyle}>EnergyBid Forecast Engine</div>
          <h2 style={forecastTitleStyle}>Tomorrow Electricity Price Forecast</h2>
          <p style={{ color: "#64748b", fontSize: 16 }}>
            24-часова AI прогноза за цената на електроенергията по часове.
          </p>

          <div style={forecastMetaStyle}>
            <span>
              📅 Прогноза за: <strong>{forecastDate}</strong>
            </span>
            <span>
              🔄 Последно обновена: <strong>{updatedAtLabel}</strong>
            </span>
            <span>
              🤖 Модел: <strong>{modelName ?? "XGBoost v2"}</strong>
            </span>
          </div>
        </div>

        <a href="/forecast" style={marketButtonDarkStyle}>
          Open Full Forecast
        </a>
      </div>

      <div style={forecastKpiGridStyle}>
        <div style={forecastKpiStyle}>
          <span>Average</span>
          <strong>{avg.toFixed(1)} €/MWh</strong>
        </div>
        <div style={forecastKpiStyle}>
          <span>Minimum</span>
          <strong>{minRaw.toFixed(1)} €/MWh</strong>
        </div>
        <div style={forecastKpiStyle}>
          <span>Maximum</span>
          <strong>{maxRaw.toFixed(1)} €/MWh</strong>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} style={chartStyle}>
        {yTicks.map((tick) => {
          const y = getY(tick);

          return (
            <g key={tick}>
              <line
                x1={paddingLeft}
                x2={width - paddingRight}
                y1={y}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
              />
              <text
                x={paddingLeft - 14}
                y={y + 5}
                textAnchor="end"
                fontSize="13"
                fill="#475569"
              >
                {tick.toFixed(0)} €
              </text>
            </g>
          );
        })}

        <line
          x1={paddingLeft}
          x2={paddingLeft}
          y1={paddingTop}
          y2={height - paddingBottom}
          stroke="#94a3b8"
        />

        <line
          x1={paddingLeft}
          x2={width - paddingRight}
          y1={height - paddingBottom}
          y2={height - paddingBottom}
          stroke="#94a3b8"
        />

        <polyline
          points={points}
          fill="none"
          stroke="#0284c7"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {data.map((d, index) => {
          const price = Number(d.forecast_price_eur_mwh);
          const x = getX(index);
          const y = getY(price);

          const hour = new Date(d.timestamp_utc).toLocaleTimeString("bg-BG", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Europe/Sofia",
          });

          return (
            <g key={d.timestamp_utc}>
              <circle cx={x} cy={y} r="5" fill="#0284c7">
                <title>
                  {hour} — {price.toFixed(2)} €/MWh
                </title>
              </circle>

              {index % 2 === 0 && (
                <text
                  x={x}
                  y={height - 14}
                  textAnchor="middle"
                  fontSize="13"
                  fill="#475569"
                >
                  {hour}
                </text>
              )}
            </g>
          );
        })}

        <text
          x={22}
          y={height / 2}
          textAnchor="middle"
          fontSize="13"
          fill="#475569"
          transform={`rotate(-90 22 ${height / 2})`}
        >
          €/MWh
        </text>
      </svg>
    </section>
  );
}

export default async function HomePage() {
  const [forecastPayload, marketExpectations] = await Promise.all([
    getLatestForecast(),
    getMarketExpectations(),
  ]);

  return (
    <main style={pageStyle}>
      <header style={headerStyle}>
        <h2 style={{ margin: 0, color: "#059669" }}>⚡ EnergyBid</h2>

        <div style={headerRoleLinksStyle}>
          <a href="/producer-onboarding" style={headerRoleButtonStyle}>
            ☀️ За производители
          </a>
          <a href="/consumer-onboarding" style={headerRoleButtonStyle}>
            🏭 За потребители
          </a>
          <a href="/prosumer-onboarding" style={headerRoleButtonStyle}>
            🔋 За просюмъри
          </a>
          <a href="/trader-onboarding" style={headerRoleButtonStyle}>
            📈 За търговци
          </a>
        </div>

        <nav style={navStyle}>
          <a href="#how">Как работи</a>
          <a href="/statistics">Статистики</a>
          <a href="/dview">DView</a>
          <a href="/login">Вход</a>
          <a href="/consumer-onboarding">Регистрация</a>
        </nav>
      </header>

      <section style={heroIntroStyle}>
        <div style={badgeStyle}>Reverse auction платформа за електроенергия</div>

        <h1 style={titleCenteredStyle}>AI Electricity Price Forecast</h1>

        <p style={subtitleCenteredStyle}>
          EnergyBid предоставя пазарни анализи
