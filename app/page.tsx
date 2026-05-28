export default function HomePage() {
  return (
    <main style={pageStyle}>
      <header style={headerStyle}>
        <h2 style={{ margin: 0, color: "#059669" }}>⚡ EnergyBid</h2>

        <nav style={navStyle}>
          <a href="#how">Как работи</a>
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
          </div>
        </div>

        <div style={marketCardStyle}>
          <h3 style={{ fontSize: 28, marginTop: 0 }}>Пазарен обзор</h3>
          <p style={{ color: "rgba(255,255,255,0.75)" }}>
            Примерна визуализация за бъдещото табло.
          </p>

          {[
            ["Средна базова цена", "152.45 лв./MWh"],
            ["Активни търгове", "24"],
            ["Участници", "126"],
            ["Средна икономия", "18%"],
          ].map(([label, value]) => (
            <div key={label} style={marketRowStyle}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>

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

const pageStyle: React.CSSProperties = {
  fontFamily: "Arial, sans-serif",
  background: "#f8fafc",
  minHeight: "100vh",
  color: "#0f172a",
};

const headerStyle: React.CSSProperties = {
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

const navStyle: React.CSSProperties = {
  display: "flex",
  gap: 22,
  fontSize: 16,
};

const heroStyle: React.CSSProperties = {
  padding: "70px 7% 70px",
  display: "grid",
  gridTemplateColumns: "1.25fr 0.75fr",
  gap: 50,
  alignItems: "start",
};

const badgeStyle: React.CSSProperties = {
  color: "#059669",
  fontWeight: 700,
  marginBottom: 18,
};

const titleStyle: React.CSSProperties = {
  fontSize: 54,
  lineHeight: 1.05,
  margin: "0 0 24px",
  maxWidth: 900,
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 20,
  color: "#475569",
  maxWidth: 820,
  marginBottom: 34,
  lineHeight: 1.5,
};

const roleGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 18,
};

const roleCardStyle: React.CSSProperties = {
  background: "white",
  padding: 22,
  borderRadius: 22,
  textDecoration: "none",
  color: "#0f172a",
  boxShadow: "0 10px 28px rgba(15,23,42,0.08)",
  border: "1px solid #e2e8f0",
  minHeight: 190,
};

const iconStyle: React.CSSProperties = {
  fontSize: 34,
  marginBottom: 10,
};

const marketCardStyle: React.CSSProperties = {
  background: "linear-gradient(135deg,#064e3b,#0369a1)",
  borderRadius: 32,
  padding: 30,
  color: "white",
  boxShadow: "0 30px 80px rgba(15,23,42,0.25)",
};

const marketRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "16px 0",
  borderBottom: "1px solid rgba(255,255,255,0.18)",
};

const infoSectionStyle: React.CSSProperties = {
  padding: "20px 7% 90px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 24,
};

const infoCardStyle: React.CSSProperties = {
  background: "white",
  padding: 30,
  borderRadius: 24,
  boxShadow: "0 14px 40px rgba(15,23,42,0.08)",
};

const stepStyle: React.CSSProperties = {
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
