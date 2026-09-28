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
    return { rows: [], updatedAt: null };
  }

  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  };

  const dataRes = await fetch(
    `${supabaseUrl}/rest/v1/vw_forecast_vs_actual_latest?select=timestamp_utc,timestamp_bg,forecast_price_eur_mwh,actual_price_eur_mwh,absolute_error_eur_mwh,absolute_error_pct,created_at&order=timestamp_utc.asc`,
    { headers, cache: "no-store" }
  );

  if (!dataRes.ok) {
    return { rows: [], updatedAt: null };
  }

  const rows = await dataRes.json();

  return {
    rows,
    updatedAt: rows?.[0]?.created_at ?? null,
  };
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

function MarketIntelligence({
  data,
}: {
  data: MarketExpectations | null;
}) {
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
}: {
  data: ForecastRow[];
  updatedAt: string | null;
}) {
  if (!data.length) {
    return (
      <section style={forecastSectionStyle}>
        <h2 style={forecastTitleStyle}>Forecast vs Actual</h2>
        <p style={{ color: "#64748b" }}>Все още няма записана прогноза.</p>
      </section>
    );
  }

  const forecastPrices = data.map((d) => Number(d.forecast_price_eur_mwh));
  const actualRows = data.filter(
    (d) =>
      d.actual_price_eur_mwh !== null &&
      d.actual_price_eur_mwh !== undefined &&
      !Number.isNaN(Number(d.actual_price_eur_mwh))
  );
  const actualPrices = actualRows.map((d) => Number(d.actual_price_eur_mwh));
  const allPrices = [...forecastPrices, ...actualPrices];

  const minRaw = Math.min(...allPrices);
  const maxRaw = Math.max(...allPrices);
  const avg = forecastPrices.reduce((a, b) => a + b, 0) / forecastPrices.length;

  const errors = actualRows
    .map((d) => Number(d.absolute_error_eur_mwh))
    .filter((value) => !Number.isNaN(value));

  const mae =
    errors.length > 0 ? errors.reduce((a, b) => a + b, 0) / errors.length : null;
  const maxError = errors.length > 0 ? Math.max(...errors) : null;
  const actualCoveragePct = data.length > 0 ? (actualRows.length / data.length) * 100 : 0;

  const forecastDate = formatDateLong(data[0]?.timestamp_utc);
  const updatedAtLabel = formatDateTime(updatedAt);

  const yMin = Math.floor((minRaw - 10) / 10) * 10;
  const yMax = Math.ceil((maxRaw + 10) / 10) * 10;

  const width = 1100;
  const height = 400;
  const paddingLeft = 78;
  const paddingRight = 30;
  const paddingTop = 28;
  const paddingBottom = 50;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  function getX(index: number) {
    return paddingLeft + (index / (data.length - 1)) * chartWidth;
  }

  function getY(price: number) {
    return paddingTop + ((yMax - price) / (yMax - yMin || 1)) * chartHeight;
  }

  const forecastPoints = data
    .map((d, index) => `${getX(index)},${getY(Number(d.forecast_price_eur_mwh))}`)
    .join(" ");

  const actualPoints = data
    .map((d, index) => {
      if (d.actual_price_eur_mwh === null || d.actual_price_eur_mwh === undefined) {
        return null;
      }

      return `${getX(index)},${getY(Number(d.actual_price_eur_mwh))}`;
    })
    .filter(Boolean)
    .join(" ");

  const yTicks = Array.from({ length: 5 }).map((_, i) => {
    return yMin + i * ((yMax - yMin) / 4);
  });

  return (
    <section style={forecastSectionStyle}>
      <div style={forecastHeaderStyle}>
        <div>
          <div style={badgeStyle}>EnergyBid Forecast Engine</div>
          <h2 style={forecastTitleStyle}>Forecast vs Actual Day-Ahead Price</h2>
          <p style={{ color: "#64748b", fontSize: 16 }}>
            Сравнение между прогнозната и реалната цена на електроенергията по часове.
          </p>

          <div style={forecastMetaStyle}>
            <span>
              📅 Прогноза за: <strong>{forecastDate}</strong>
            </span>
            <span>
              🔄 Последно обновена: <strong>{updatedAtLabel}</strong>
            </span>
          </div>

          <div style={legendStyle}>
            <span style={legendItemStyle}>
              <span style={{ ...legendDotStyle, background: "#0284c7" }} />
              Forecast
            </span>
            <span style={legendItemStyle}>
              <span style={{ ...legendDotStyle, background: "#16a34a" }} />
              Actual
            </span>
          </div>
        </div>

        <a href="/forecast" style={marketButtonDarkStyle}>
          Open Full Forecast
        </a>
      </div>

      <div style={forecastKpiGridStyle}>
        <div style={forecastKpiStyle}>
          <span>Forecast Average</span>
          <strong>{avg.toFixed(1)} €/MWh</strong>
        </div>
        <div style={forecastKpiStyle}>
          <span>MAE</span>
          <strong>{mae === null ? "—" : `${mae.toFixed(1)} €/MWh`}</strong>
        </div>
        <div style={forecastKpiStyle}>
          <span>Max Error</span>
          <strong>{maxError === null ? "—" : `${maxError.toFixed(1)} €/MWh`}</strong>
        </div>
        <div style={forecastKpiStyle}>
          <span>Actual Coverage</span>
          <strong>{actualCoveragePct.toFixed(0)}%</strong>
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
          points={forecastPoints}
          fill="none"
          stroke="#0284c7"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {actualPoints && (
          <polyline
            points={actualPoints}
            fill="none"
            stroke="#16a34a"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {data.map((d, index) => {
          const forecastPrice = Number(d.forecast_price_eur_mwh);
          const actualPrice =
            d.actual_price_eur_mwh === null || d.actual_price_eur_mwh === undefined
              ? null
              : Number(d.actual_price_eur_mwh);

          const x = getX(index);
          const forecastY = getY(forecastPrice);
          const actualY = actualPrice === null ? null : getY(actualPrice);

          const hour = new Date(d.timestamp_utc).toLocaleTimeString("bg-BG", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Europe/Sofia",
          });

          return (
            <g key={d.timestamp_utc}>
              <circle cx={x} cy={forecastY} r="5" fill="#0284c7">
                <title>
                  {hour} — Forecast: {forecastPrice.toFixed(2)} €/MWh
                  {actualPrice !== null
                    ? ` | Actual: ${actualPrice.toFixed(2)} €/MWh`
                    : ""}
                </title>
              </circle>

              {actualY !== null && (
                <circle cx={x} cy={actualY} r="5" fill="#16a34a">
                  <title>
                    {hour} — Actual: {actualPrice?.toFixed(2)} €/MWh | Forecast:{" "}
                    {forecastPrice.toFixed(2)} €/MWh
                  </title>
                </circle>
              )}

              {index % 2 === 0 && (
                <text
                  x={x}
                  y={height - 16}
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
          EnergyBid предоставя пазарни анализи, прогнози и статистики за
          електроенергийния пазар, подпомагайки потребители, производители,
          просюмъри и търговци при вземането на по-добри решения.
        </p>
      </section>

      <ForecastChart
        data={forecastPayload.rows}
        updatedAt={forecastPayload.updatedAt}
      />

      <MarketIntelligence data={marketExpectations} />

      <section id="how" style={infoSectionStyle}>
        {[
          [
            "1",
            "Потребителите качват фактура",
            "Системата извлича автоматично клиент, ИТН, консумация, тарифи и период.",
          ],
          [
            "2",
            "Създава се търг",
            "От извлечените данни се подготвя заявка за доставка на електроенергия.",
          ],
          [
            "3",
            "Търговците подават оферти",
            "Платформата сравнява офертите и помага за избор на най-добри условия.",
          ],
        ].map(([number, title, text]) => (
          <div key={title} style={infoCardStyle}>
            <div style={stepStyle}>{number}</div>
            <h3>{title}</h3>
            <p style={{ color: "#64748b", lineHeight: 1.5 }}>{text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}

const pageStyle: CSSProperties = {
  fontFamily: "Arial, sans-serif",
  background: "#f8fafc",
  minHeight: "100vh",
  color: "#0f172a",
};

const headerStyle: CSSProperties = {
  padding: "18px 4%",
  display: "grid",
  gridTemplateColumns: "180px 1fr auto",
  alignItems: "center",
  gap: 24,
  background: "rgba(248,250,252,0.97)",
  position: "sticky",
  top: 0,
  zIndex: 20,
  borderBottom: "1px solid #e2e8f0",
};

const headerRoleLinksStyle: CSSProperties = {
  display: "flex",
  gap: 14,
  justifyContent: "center",
  flexWrap: "wrap",
};

const headerRoleButtonStyle: CSSProperties = {
  background: "white",
  border: "1px solid #dbeafe",
  borderRadius: 999,
  padding: "16px 24px",
  minHeight: 56,
  color: "#0f172a",
  textDecoration: "none",
  fontWeight: 800,
  fontSize: 16,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 8px 22px rgba(15,23,42,0.08)",
};

const navStyle: CSSProperties = {
  display: "flex",
  gap: 18,
  fontSize: 15,
  alignItems: "center",
  whiteSpace: "nowrap",
};

const heroIntroStyle: CSSProperties = {
  padding: "38px 7% 8px",
  textAlign: "center",
};

const titleCenteredStyle: CSSProperties = {
  fontSize: 52,
  lineHeight: 1.05,
  margin: "0 auto 18px",
  maxWidth: 1050,
};

const subtitleCenteredStyle: CSSProperties = {
  fontSize: 20,
  color: "#475569",
  maxWidth: 980,
  margin: "0 auto 18px",
  lineHeight: 1.5,
};

const badgeStyle: CSSProperties = {
  color: "#059669",
  fontWeight: 700,
  marginBottom: 14,
};

const marketButtonDarkStyle: CSSProperties = {
  display: "inline-block",
  background: "#0f172a",
  color: "white",
  padding: "14px 22px",
  borderRadius: 14,
  fontWeight: 800,
  textDecoration: "none",
  whiteSpace: "nowrap",
};

const forecastSectionStyle: CSSProperties = {
  margin: "18px auto 40px",
  maxWidth: 1320,
  background: "white",
  borderRadius: 32,
  padding: 36,
  boxShadow: "0 22px 60px rgba(15,23,42,0.12)",
  border: "1px solid #e2e8f0",
};

const forecastHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 24,
  marginBottom: 24,
};

const forecastTitleStyle: CSSProperties = {
  margin: "0 0 10px",
  fontSize: 34,
};

const forecastMetaStyle: CSSProperties = {
  display: "flex",
  gap: 18,
  flexWrap: "wrap",
  marginTop: 10,
  color: "#475569",
  fontSize: 14,
  fontWeight: 600,
};

const legendStyle: CSSProperties = {
  display: "flex",
  gap: 18,
  flexWrap: "wrap",
  marginTop: 16,
};

const legendItemStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  color: "#475569",
  fontSize: 14,
  fontWeight: 700,
};

const legendDotStyle: CSSProperties = {
  width: 12,
  height: 12,
  borderRadius: 999,
  display: "inline-block",
};

const forecastKpiGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 16,
  marginBottom: 26,
};

const forecastKpiStyle: CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 18,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const chartStyle: CSSProperties = {
  width: "100%",
  height: 410,
  display: "block",
};

const marketSectionStyle: CSSProperties = {
  margin: "0 auto 70px",
  maxWidth: 1320,
  background: "white",
  borderRadius: 32,
  padding: 36,
  boxShadow: "0 22px 60px rgba(15,23,42,0.10)",
  border: "1px solid #e2e8f0",
};

const marketHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 24,
  marginBottom: 26,
};

const marketTitleStyle: CSSProperties = {
  margin: "0 0 10px",
  fontSize: 34,
};

const marketSubtitleStyle: CSSProperties = {
  color: "#64748b",
  fontSize: 16,
  lineHeight: 1.55,
  maxWidth: 820,
};

const marketCardGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: 18,
};

const marketCardStyle: CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 24,
  padding: 24,
  minHeight: 210,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  gap: 10,
};

const marketIconStyle: CSSProperties = {
  fontSize: 30,
};

const marketCardLabelStyle: CSSProperties = {
  color: "#475569",
  fontWeight: 800,
};

const marketCardValueStyle: CSSProperties = {
  fontSize: 28,
  lineHeight: 1.1,
};

const marketCardNoteStyle: CSSProperties = {
  margin: 0,
  color: "#64748b",
  fontSize: 14,
  lineHeight: 1.45,
};

const marketCardSourceStyle: CSSProperties = {
  margin: 0,
  color: "#94a3b8",
  fontSize: 13,
  lineHeight: 1.4,
};

const marketSignalGridStyle: CSSProperties = {
  marginTop: 22,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};

const marketSignalStyle: CSSProperties = {
  background: "#ecfdf5",
  border: "1px solid #bbf7d0",
  borderRadius: 18,
  padding: 18,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  gap: 8,
};

const infoSectionStyle: CSSProperties = {
  padding: "20px 7% 90px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 24,
};

const infoCardStyle: CSSProperties = {
  background: "white",
  padding: 30,
  borderRadius: 24,
  boxShadow: "0 14px 40px rgba(15,23,42,0.08)",
};

const stepStyle: CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 12,
  background: "#059669",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 800,
};
