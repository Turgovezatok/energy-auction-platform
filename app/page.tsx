export default function HomePage() {
  return (
    <main style={{ fontFamily: "Arial, sans-serif", background: "#f8fafc", minHeight: "100vh", color: "#0f172a" }}>
      <header style={{ padding: "22px 7%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(248,250,252,0.9)", position: "sticky", top: 0 }}>
        <h2 style={{ margin: 0, color: "#059669" }}>⚡ EnergyBid</h2>
        <nav style={{ display: "flex", gap: 22, fontSize: 16 }}>
          <a>Как работи</a>
          <a>Вход</a>
          <a>Регистрация</a>
        </nav>
      </header>

      <section style={{ padding: "90px 7% 70px", display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 50, alignItems: "center" }}>
        <div>
          <div style={{ color: "#059669", fontWeight: 700, marginBottom: 18 }}>
            Reverse auction платформа за електроенергия
          </div>

          <h1 style={{ fontSize: 58, lineHeight: 1.05, margin: "0 0 26px", maxWidth: 850 }}>
            Търгове за електроенергия между потребители, търговци и производители
          </h1>

          <p style={{ fontSize: 21, color: "#475569", maxWidth: 760, marginBottom: 34, lineHeight: 1.5 }}>
            Потребителите публикуват заявки, а търговци и производители подават конкурентни оферти.
            Целта е по-прозрачен пазар, по-добри цени и по-бърз избор на доставчик.
          </p>

          <div style={{ display: "flex", gap: 16 }}>
            <button style={{ padding: "15px 26px", borderRadius: 14, border: 0, background: "#059669", color: "white", fontSize: 17, fontWeight: 700 }}>
              Създай търг
            </button>
            <button style={{ padding: "15px 26px", borderRadius: 14, border: "1px solid #cbd5e1", background: "white", fontSize: 17 }}>
              Вход в платформата
            </button>
          </div>
        </div>

        <div style={{ background: "linear-gradient(135deg,#064e3b,#0369a1)", borderRadius: 32, padding: 30, color: "white", boxShadow: "0 30px 80px rgba(15,23,42,0.25)" }}>
          <h3 style={{ fontSize: 28, marginTop: 0 }}>Пазарен обзор</h3>
          <p style={{ color: "rgba(255,255,255,0.75)" }}>Примерна визуализация за бъдещото табло.</p>

          {[
            ["Средна базова цена", "152.45 лв./MWh"],
            ["Активни търгове", "24"],
            ["Участници", "126"],
            ["Средна икономия", "18%"]
          ].map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.18)" }}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: "30px 7% 90px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
        {[
          ["🏭", "Потребители", "Пускат търг за доставка на електроенергия според количество, период и профил."],
          ["📊", "Търговци", "Подават оферти и се конкурират директно за клиента."],
          ["☀️", "Производители", "Предлагат директна енергия, зелени продукти и PPA договори."]
        ].map(([icon, title, text]) => (
          <div key={title} style={{ background: "white", padding: 30, borderRadius: 24, boxShadow: "0 14px 40px rgba(15,23,42,0.08)" }}>
            <div style={{ fontSize: 34, marginBottom: 16 }}>{icon}</div>
            <h3 style={{ fontSize: 22, marginBottom: 10 }}>{title}</h3>
            <p style={{ color: "#64748b", lineHeight: 1.5 }}>{text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
