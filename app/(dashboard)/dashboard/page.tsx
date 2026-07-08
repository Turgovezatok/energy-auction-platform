export default function DashboardPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f1f5f9",
        fontFamily: "Arial",
        display: "flex",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: 260,
          background: "#0f172a",
          color: "white",
          padding: 24,
        }}
      >
        <h2
          style={{
            marginBottom: 40,
            color: "#10b981",
          }}
        >
          EnergyBid
        </h2>

        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <a href="#" style={{ color: "white", textDecoration: "none" }}>
            Dashboard
          </a>

          <a href="#" style={{ color: "white", textDecoration: "none" }}>
            Моите търгове
          </a>

          <a href="#" style={{ color: "white", textDecoration: "none" }}>
            Оферти
          </a>

          <a href="#" style={{ color: "white", textDecoration: "none" }}>
            Пазар
          </a>

          <a href="#" style={{ color: "white", textDecoration: "none" }}>
            Настройки
          </a>
        </nav>
      </aside>

      {/* Content */}
      <section
        style={{
          flex: 1,
          padding: 40,
        }}
      >
        <h1
          style={{
            fontSize: 40,
            marginBottom: 12,
          }}
        >
          Dashboard
        </h1>

        <p
          style={{
            color: "#64748b",
            marginBottom: 40,
          }}
        >
          Добре дошли в EnergyBid платформата.
        </p>

        {/* Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 24,
          }}
        >
          <div
            style={{
              background: "white",
              padding: 28,
              borderRadius: 20,
            }}
          >
            <h3>Активни търгове</h3>

            <p
              style={{
                fontSize: 42,
                fontWeight: 700,
                color: "#10b981",
              }}
            >
              12
            </p>
          </div>

          <div
            style={{
              background: "white",
              padding: 28,
              borderRadius: 20,
            }}
          >
            <h3>Получени оферти</h3>

            <p
              style={{
                fontSize: 42,
                fontWeight: 700,
                color: "#0ea5e9",
              }}
            >
              37
            </p>
          </div>

          <div
            style={{
              background: "white",
              padding: 28,
              borderRadius: 20,
            }}
          >
            <h3>Средна цена</h3>

            <p
              style={{
                fontSize: 42,
                fontWeight: 700,
                color: "#f59e0b",
              }}
            >
              152 лв
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
