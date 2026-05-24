export default function HomePage() {
  return (
    <main style={{ fontFamily: "Arial, sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      <header style={{ padding: "24px 8%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, color: "#059669" }}>EnergyBid</h2>
        <nav style={{ display: "flex", gap: 16 }}>
          <a>Вход</a>
          <a>Регистрация</a>
        </nav>
      </header>

      <section style={{ padding: "80px 8%", maxWidth: 1100 }}>
        <h1 style={{ fontSize: 56, lineHeight: 1.1, marginBottom: 24 }}>
          Търгове за електроенергия между потребители, търговци и производители
        </h1>

        <p style={{ fontSize: 20, color: "#475569", maxWidth: 720, marginBottom: 32 }}>
          Платформа за обратни търгове, в която потребителите публикуват заявки,
          а търговци и производители подават конкурентни оферти.
        </p>

        <div style={{ display: "flex", gap: 16 }}>
          <button style={{ padding: "14px 24px", borderRadius: 12, border: 0, background: "#059669", color: "white", fontSize: 16 }}>
            Създай търг
          </button>
          <button style={{ padding: "14px 24px", borderRadius: 12, border: "1px solid #cbd5e1", background: "white", fontSize: 16 }}>
            Вход в платформата
          </button>
        </div>
      </section>

      <section style={{ padding: "40px 8%", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
        {[
          ["Потребители", "Пускат търг за доставка на електроенергия."],
          ["Търговци", "Подават оферти и се конкурират за клиента."],
          ["Производители", "Предлагат директна енергия и PPA продукти."]
        ].map(([title, text]) => (
          <div key={title} style={{ background: "white", padding: 28, borderRadius: 20, boxShadow: "0 10px 30px rgba(15,23,42,0.08)" }}>
            <h3>{title}</h3>
            <p style={{ color: "#64748b" }}>{text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
