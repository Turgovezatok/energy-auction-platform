"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function MyAuctionsPage() {
  const [auctions, setAuctions] = useState<any[]>([]);

  useEffect(() => {
    loadAuctions();
  }, []);

  async function loadAuctions() {
    const { data } = await supabase
      .from("auctions")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    setAuctions(data || []);
  }

  return (
    <main style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>
            Моите търгове
          </h1>

          <p style={subtitleStyle}>
            Управление на активни и приключили търгове
          </p>
        </div>

        <div style={counterStyle}>
          ⚡ {auctions.length} търга
        </div>
      </div>

      <section style={gridStyle}>
        {auctions.map((auction) => (
          <article
            key={auction.id}
            style={cardStyle}
          >
            <div style={topRowStyle}>
              <div>
                <div style={badgeStyle}>
                  Активен търг
                </div>

                <h2 style={companyStyle}>
                  {auction.title}
                </h2>

                <p style={supplierStyle}>
                  Номер:
                  {" "}
                  {auction.auction_number}
                </p>
              </div>

              <div style={iconBoxStyle}>
                ⚡
              </div>
            </div>

            <div style={infoGridStyle}>
              <Info
                label="Тип"
                value={
                  auction.board_type ===
                  "buy"
                    ? "Покупка"
                    : "Продажба"
                }
              />

              <Info
  label="Консумация"
  value={`${auction.quantity_mwh || "-"} MWh`}
/>

              <Info
                label="Договор"
                value={`${auction.duration_months || "-"} месеца`}
              />

              <Info
                label="Текущ доставчик"
                value={
                  auction.current_supplier ||
                  "-"
                }
              />
            </div>

            <div style={footerStyle}>
              <button
                style={
                  secondaryButtonStyle
                }
              >
                Оферти
              </button>

              <button
                style={primaryButtonStyle}
              >
                Детайли
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={infoStyle}>
      <span style={infoLabelStyle}>
        {label}
      </span>

      <strong>{value}</strong>
    </div>
  );
}

const pageStyle: React.CSSProperties =
  {
    minHeight: "100vh",
    background: "#f3f6fb",
    padding: 40,
    fontFamily: "Arial",
  };

const headerStyle: React.CSSProperties =
  {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    marginBottom: 32,
  };

const titleStyle: React.CSSProperties =
  {
    fontSize: 46,
    fontWeight: 800,
    margin: 0,
  };

const subtitleStyle: React.CSSProperties =
  {
    color: "#64748b",
    fontSize: 18,
  };

const counterStyle: React.CSSProperties =
  {
    background: "white",
    padding: "14px 20px",
    borderRadius: 18,
    boxShadow:
      "0 8px 30px rgba(15,23,42,0.08)",
    fontWeight: 700,
  };

const gridStyle: React.CSSProperties =
  {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fill, minmax(420px, 1fr))",
    gap: 24,
  };

const cardStyle: React.CSSProperties =
  {
    background: "white",
    padding: 26,
    borderRadius: 26,
    boxShadow:
      "0 12px 40px rgba(15,23,42,0.08)",
    border: "1px solid #e2e8f0",
  };

const topRowStyle: React.CSSProperties =
  {
    display: "flex",
    justifyContent:
      "space-between",
    gap: 16,
  };

const badgeStyle: React.CSSProperties =
  {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: 999,
    background: "#dbeafe",
    color: "#1d4ed8",
    fontWeight: 700,
    fontSize: 13,
    marginBottom: 12,
  };

const companyStyle: React.CSSProperties =
  {
    fontSize: 24,
    fontWeight: 800,
    margin: "0 0 8px",
  };

const supplierStyle: React.CSSProperties =
  {
    color: "#64748b",
    margin: 0,
  };

const iconBoxStyle: React.CSSProperties =
  {
    width: 54,
    height: 54,
    borderRadius: 18,
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 26,
  };

const infoGridStyle: React.CSSProperties =
  {
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr",
    gap: 14,
    marginTop: 24,
  };

const infoStyle: React.CSSProperties =
  {
    background: "#f8fafc",
    borderRadius: 16,
    padding: 14,
  };

const infoLabelStyle: React.CSSProperties =
  {
    display: "block",
    color: "#64748b",
    fontSize: 13,
    marginBottom: 6,
  };

const footerStyle: React.CSSProperties =
  {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 24,
  };

const secondaryButtonStyle: React.CSSProperties =
  {
    padding: "12px 16px",
    borderRadius: 14,
    border: "1px solid #cbd5e1",
    background: "white",
    color: "#0f172a",
    fontWeight: 700,
    cursor: "pointer",
  };

const primaryButtonStyle: React.CSSProperties =
  {
    padding: "12px 18px",
    borderRadius: 14,
    border: 0,
    background: "#2563eb",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
  };
