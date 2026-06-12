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
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

  const width = 1000;
  const height = 300;
  const padding = 40;

  const points = data
    .map((d, index) => {
      const x =
        padding + (index / (data.length - 1)) * (width - padding * 2);
      const y =
        height -
        padding -
        ((Number(d.forecast_price_eur_mwh) - min) / (max - min || 1)) *
          (height - padding * 2);

      return `${x},${y}`;
    })
    .join(" ");

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
          <strong>{min.toFixed(1)} €/MWh</strong>
        </div>
        <div style={forecastKpiStyle}>
          <span>Maximum</span>
          <strong>{max.toFixed(1)} €/MWh</strong>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} style={chartStyle}>
        {[0, 1, 2, 3].map((i) => {
          const y = padding + i * ((height - padding * 2) / 3);
          return (
            <line
              key={i}
              x1={padding}
              x2={width - padding}
              y1={y}
              y2={y}
              stroke="#e2e8f0"
              strokeDasharray="4 4"
            />
          );
        })}

        <polyline
          points={points}
          fill="none"
          stroke="#0284c7"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {data.map((d, index) => {
          const x =
            padding + (index / (data.length - 1)) * (width - padding * 2);
          const y =
            height -
            padding -
            ((Number(d.forecast_price_eur_mwh) - min) / (max - min || 1)) *
              (height - padding * 2);

          const hour = new Date(d.timestamp_utc).toLocaleTimeString("bg-BG", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Europe/Sofia",
          });

          return (
            <g key={d.timestamp_utc}>
              <circle cx={x} cy={y} r="4" fill="#0284c7" />
              {index % 2 === 0 && (
                <text
                  x={x}
                  y={height - 8}
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

        <nav style={navStyle}>
          <a href="#how">Как работи</a>
          <a href="/statistics">Статистики</a>
          <a href="/dview">DView</a>
          <a href="/login">Вход</a>
          <a href="/consumer-onboarding">Регистрация</a>
        </nav>
      </header>

      <section style={heroStyle}>
        <div>
          <div style={badgeStyle}>Reverse auction платформа за електроенергия</div>

          <h1 style={titleStyle}>
            Изберете своя профил и започнете правилния процес
          </h1>

          <p style={subtitleStyle}>
            Потребители, просюмъри, производители и търговци влизат през
            отделен процес, за да няма объркване при регистрация, фактури,
            активи и оферти.
          </p>

          <div style={roleGridStyle}>
            <a href="/producer-onboarding" style={roleCardStyle}>
              <div style={iconStyle}>☀️</div>
              <h3>За производители</h3>
              <p>ФЕЦ, ВЕИ паркове, батерии, PPA и продажба на енергия.</p>
            </a>

            <a href="/consumer-onboarding" style={roleCardStyle}>
              <div style={iconStyle}>🏭</div>
              <h3>За потребители</h3>
              <p>Попълване на данни, качване на фактура и създаване на търг.</p>
            </a>

            <a href="/prosumer-onboarding" style={roleCardStyle}>
              <div style={iconStyle}>🔋</div>
              <h3>За потребители с централа</h3>
              <p>ФЕЦ, собствено потребление, излишък към мрежата и батерии.</p>
            </a>

            <a href="/trader-onboarding" style={roleCardStyle}>
              <div style={iconStyle}>📈</div>
              <h3>За търговци</h3>
              <p>Достъп до търгове, подаване на оферти и управление на клиенти.</p>
            </a>

            <a href="/statistics" style={roleCardStyle}>
              <div style={iconStyle}>📊</div>
              <h3>Статистики</h3>
              <p>Публични справки за Capture Price, Capture Rate и технологии.</p>
            </a>
          </div>
        </div>

        <div style={marketCardStyle}>
          <h3 style={{ fontSize: 28, marginTop: 0 }}>Пазарен обзор</h3>
          <p style={{ color: "rgba(255,255,255,0.75)" }}>
            Публични пазарни справки и статистики.
          </p>

          <a href="/statistics" style={marketButtonStyle}>
            Виж статистики
          </a>
        </div>
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
  padding: "22px 7%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "rgba(248,250,252,0.95)",
  position: "sticky",
  top: 0,
  zIndex: 20,
  borderBottom: "1px solid #e2e8f0",
};

const navStyle: CSSProperties = {
  display: "flex",
  gap: 22,
  fontSize: 16,
};

const heroStyle: CSSProperties = {
  padding: "70px 7% 45px",
  display: "grid",
  gridTemplateColumns: "1.25fr 0.75fr",
  gap: 50,
  alignItems: "start",
};

const badgeStyle: CSSProperties = {
  color: "#059669",
  fontWeight: 700,
  marginBottom: 18,
};

const titleStyle: CSSProperties = {
  fontSize: 54,
  lineHeight: 1.05,
  margin: "0 0 24px",
  maxWidth: 900,
};

const subtitleStyle: CSSProperties = {
  fontSize: 20,
  color: "#475569",
  maxWidth: 820,
  marginBottom: 34,
  lineHeight: 1.5,
};

const roleGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 18,
};

const roleCardStyle: CSSProperties = {
  background: "white",
  padding: 22,
  borderRadius: 22,
  textDecoration: "none",
  color: "#0f172a",
  boxShadow: "0 10px 28px rgba(15,23,42,0.08)",
  border: "1px solid #e2e8f0",
  minHeight: 190,
};

const iconStyle: CSSProperties = {
  fontSize: 34,
  marginBottom: 10,
};

const marketCardStyle: CSSProperties = {
  background: "linear-gradient(135deg,#064e3b,#0369a1)",
  borderRadius: 32,
  padding: 30,
  color: "white",
  boxShadow: "0 30px 80px rgba(15,23,42,0.25)",
};

const marketButtonStyle: CSSProperties = {
  display: "inline-block",
  marginTop: 20,
  background: "white",
  color: "#064e3b",
  padding: "14px 22px",
  borderRadius: 14,
  fontWeight: 800,
  textDecoration: "none",
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
  margin: "0 7% 70px",
  background: "white",
  borderRadius: 30,
  padding: 34,
  boxShadow: "0 18px 50px rgba(15,23,42,0.10)",
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
  fontSize: 30,
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
  height: 340,
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
