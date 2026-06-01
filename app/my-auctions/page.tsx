"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function MyAuctionsPage() {
  const [auctions, setAuctions] = useState<any[]>([]);

  useEffect(() => {
    loadAuctions();

    const timer = setInterval(() => {
      setAuctions((current) => [...current]);
    }, 60000);

    return () => clearInterval(timer);
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
          <h1 style={titleStyle}>Моите търгове</h1>

          <p style={subtitleStyle}>
            Управление на активни и приключили търгове
          </p>
        </div>

        <div style={counterStyle}>⚡ {auctions.length} търга</div>
      </div>

      <section style={gridStyle}>
        {auctions.map((auction) => (
          <article key={auction.id} style={cardStyle}>
            <div style={topRowStyle}>
              <div>
                <div style={badgeStyle}>
                  {getAuctionStatus(auction.offer_deadline)}
                </div>

                <h2 style={companyStyle}>
                  {auction.title || "Търг за електроенергия"}
                </h2>

                <p style={supplierStyle}>
                  Номер: {auction.auction_number || "—"}
                </p>
              </div>

              <div style={iconBoxStyle}>⚡</div>
            </div>

            <div style={infoGridStyle}>
              <Info
                label="Тип"
                value={auction.board_type === "buy" ? "Покупка" : "Продажба"}
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
                value={auction.current_supplier || "-"}
              />

              <Info
                label="Начало доставка"
                value={formatDate(auction.delivery_start)}
              />

              <Info
                label="Краен срок оферти"
                value={formatDateTime(auction.offer_deadline)}
              />
            </div>

            <div style={countdownStyle}>
              <span style={countdownLabelStyle}>Край след:</span>

              <strong>{getTimeLeft(auction.offer_deadline)}</strong>
            </div>

            <div style={footerStyle}>
              <a
                href={`/auction/${auction.id}/bids`}
                style={secondaryLinkStyle}
              >
                Оферти
              </a>

              <a href={`/auction/${auction.id}`} style={primaryLinkStyle}>
                Детайли
              </a>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function getAuctionStatus(deadline?: string) {
  if (!deadline) return "Активен търг";

  const end = new Date(deadline).getTime();
  const now = new Date().getTime();

  if (end <= now) return "Изтекъл";

  return "Активен";
}

function getTimeLeft(deadline?: string) {
  if (!deadline) return "Няма срок";

  const end = new Date(deadline).getTime();
  const now = new Date().getTime();
  const diff = end - now;

  if (diff <= 0) return "Изтекъл";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);

  return `${days}д ${hours}ч ${minutes}м`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString("bg-BG");
  } catch {
    return value;
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString("bg-BG", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoStyle}>
      <span style={infoLabelStyle}>{label}</span>

      <strong>{value}</strong>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f3f6fb",
  padding: 40,
  fontFamily: "Arial",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 32,
};

const titleStyle: React.CSSProperties = {
  fontSize: 46,
  fontWeight: 800,
  margin: 0,
};

const subtitleStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 18,
};

const counterStyle: React.CSSProperties = {
  background: "white",
  padding: "14px 20px",
  borderRadius: 18,
  boxShadow: "0 8px 30px rgba(15,23,42,0.08)",
  fontWeight: 700,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))",
  gap: 24,
};

const cardStyle: React.CSSProperties = {
  background: "white",
  padding: 26,
  borderRadius: 26,
  boxShadow: "0 12px 40px rgba(15,23,42,0.08)",
  border: "1px solid #e2e8f0",
};

const topRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
};

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  padding: "8px 12px",
  borderRadius: 999,
  background: "#dbeafe",
  color: "#1d4ed8",
  fontWeight: 700,
  fontSize: 13,
  marginBottom: 12,
};

const companyStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 800,
  margin: "0 0 8px",
};

const supplierStyle: React.CSSProperties = {
  color: "#64748b",
  margin: 0,
};

const iconBoxStyle: React.CSSProperties = {
  width: 54,
  height: 54,
  borderRadius: 18,
  background: "#eff6ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 26,
};

const infoGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 14,
  marginTop: 24,
};

const infoStyle: React.CSSProperties = {
  background: "#f8fafc",
  borderRadius: 16,
  padding: 14,
};

const infoLabelStyle: React.CSSProperties = {
  display: "block",
  color: "#64748b",
  fontSize: 13,
  marginBottom: 6,
};

const countdownStyle: React.CSSProperties = {
  marginTop: 22,
  paddingTop: 18,
  borderTop: "1px solid #e2e8f0",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  color: "#0f172a",
  fontWeight: 700,
};

const countdownLabelStyle: React.CSSProperties = {
  color: "#64748b",
};

const footerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  marginTop: 24,
};

const secondaryLinkStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 14,
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#0f172a",
  fontWeight: 700,
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-block",
};

const primaryLinkStyle: React.CSSProperties = {
  padding: "12px 18px",
  borderRadius: 14,
  border: 0,
  background: "#2563eb",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-block",
};
