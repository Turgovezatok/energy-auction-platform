import type { CSSProperties } from "react";

type ForecastRow = {
  timestamp_utc: string;
  forecast_price_eur_mwh: number;
};

async function getLatestForecast(): Promise<ForecastRow[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return [];

  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  };

  const latestRunRes = await fetch(
    `${supabaseUrl}/rest/v1/price_forecast_results?select=forecast_run_id,created_at&order=created_at.desc&limit=1`,
    { headers, cache: "no-store" }
  );

  const latestRun = await latestRunRes.json();
  const forecastRunId = latestRun?.[0]?.forecast_run_id;

  if (!forecastRunId) return [];

  const dataRes = await fetch(
    `${supabaseUrl}/rest/v1/price_forecast_results?select=timestamp_utc,forecast_price_eur_mwh&forecast_run_id=eq.${forecastRunId}&order=timestamp_utc.asc`,
    { headers, cache: "no-store" }
  );

  return dataRes.json();
}

function ForecastChart({ data }: { data: ForecastRow[] }) {
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
  const forecastData = await getLatestForecast();

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

      <ForecastChart data={forecastData} />

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
  margin: "18px auto 70px",
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
  height: 390,
  display: "block",
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
