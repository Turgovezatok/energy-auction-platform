"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Auction = {
  id: string;
  title: string;
  sector: string;
  duration_months: number;
  annual_consumption_mwh: number;
  delivery_start_date: string;
  offer_deadline_date: string;
  has_pv: boolean;
  network_components_included: boolean;
  accepts_fixed_price: boolean;
  accepts_day_ahead_with_balancing: boolean;
  accepts_day_ahead_without_balancing: boolean;
  accepts_hybrid: boolean;
  contract_type: string;
  preferred_payment_days: number;
};

export default function BuyMarketPage() {
  const [auctions, setAuctions] = useState<Auction[]>([]);

  useEffect(() => {
    loadAuctions();
  }, []);

  async function loadAuctions() {
    const { data } = await supabase
      .from("auctions")
      .select("*")
      .eq("board_type", "buy")
      .order("created_at", { ascending: false });

    if (data) setAuctions(data);
  }

  return (
    <main style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Табло Купува</h1>
          <p style={subtitleStyle}>Активни заявки за покупка на електроенергия</p>
        </div>

        <div style={counterStyle}>{auctions.length} активни търга</div>
      </header>

      <section style={cardsWrapStyle}>
        {auctions.map((auction) => (
          <article key={auction.id} style={cardStyle}>
            <div style={topRowStyle}>
              <span style={activeBadgeStyle}>
                <span style={dotStyle}></span>
                АКТИВЕН
              </span>

              <span style={durationStyle}>{auction.duration_months} месеца</span>
            </div>

            <h2 style={auctionTitleStyle}>{auction.title}</h2>
            <p style={sectorStyle}>{auction.sector || "Без сектор"}</p>

            <div style={metricGridStyle}>
              <Metric icon="📈" label="Консумация" value={`${auction.annual_consumption_mwh || 0} MWh`} />
              <Metric icon="📅" label="Начало доставка" value={auction.delivery_start_date || "-"} />
              <Metric icon="⏳" label="Оферти до" value={auction.offer_deadline_date || "-"} />
              <Metric icon="💳" label="Плащане" value={`${auction.preferred_payment_days || "-"} дни`} />
            </div>

            <div style={tagWrapStyle}>
              {auction.accepts_fixed_price && <Tag icon="🏷️" text="Фиксирана цена" bg="#dbeafe" color="#1e40af" />}
              {auction.accepts_day_ahead_with_balancing && <Tag icon="⚡" text="DA + балансиране" bg="#dcfce7" color="#166534" />}
              {auction.accepts_day_ahead_without_balancing && <Tag icon="⚖️" text="Без небаланс" bg="#fef3c7" color="#92400e" />}
              {auction.accepts_hybrid && <Tag icon="🔗" text="Хибриден модел" bg="#ede9fe" color="#5b21b6" />}
              {auction.has_pv && <Tag icon="☀️" text="Prosumer / ФЕЦ" bg="#fce7f3" color="#9d174d" />}
              {auction.network_components_included && <Tag icon="▦" text="С мрежови" bg="#e0f2fe" color="#075985" />}
            </div>

            <div style={dividerStyle}></div>

            <footer style={footerStyle}>
              <div style={contractWrapStyle}>
                <div style={contractIconStyle}>📄</div>
                <div>
                  <div style={smallLabelStyle}>Тип договор</div>
                  <strong>{auction.contract_type === "closed" ? "Затворен" : "Отворен"}</strong>
                </div>
              </div>

              <button style={buttonStyle}>Подай оферта →</button>
            </footer>
          </article>
        ))}
      </section>
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div style={metricStyle}>
      <div style={metricIconStyle}>{icon}</div>
      <div>
        <div style={smallLabelStyle}>{label}</div>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function Tag({
  icon,
  text,
  bg,
  color,
}: {
  icon: string;
  text: string;
  bg: string;
  color: string;
}) {
  return (
    <span style={{ ...tagStyle, background: bg, color }}>
      <span>{icon}</span>
      {text}
    </span>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f1f5f9",
  padding: 40,
  fontFamily: "Arial, sans-serif",
  color: "#0f172a",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 34,
};

const titleStyle: React.CSSProperties = {
  fontSize: 46,
  margin: 0,
};

const subtitleStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 20,
};

const counterStyle: React.CSSProperties = {
  background: "white",
  padding: "16px 24px",
  borderRadius: 18,
  fontWeight: 800,
  boxShadow: "0 12px 35px rgba(15,23,42,0.06)",
};

const cardsWrapStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(520px, 1fr))",
  gap: 28,
};

const cardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 28,
  padding: 32,
  boxShadow: "0 18px 55px rgba(15,23,42,0.09)",
  border: "1px solid #e2e8f0",
};

const topRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 26,
};

const activeBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: "#dcfce7",
  color: "#166534",
  padding: "9px 14px",
  borderRadius: 999,
  fontSize: 14,
  fontWeight: 800,
};

const dotStyle: React.CSSProperties = {
  width: 10,
  height: 10,
  background: "#16a34a",
  borderRadius: "50%",
};

const durationStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 17,
};

const auctionTitleStyle: React.CSSProperties = {
  fontSize: 30,
  margin: "0 0 12px",
};

const sectorStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 22,
  marginBottom: 30,
};

const metricGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 18,
  marginBottom: 30,
};

const metricStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  background: "#f8fafc",
  borderRadius: 22,
  padding: 18,
};

const metricIconStyle: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 14,
  background: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const tagWrapStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 14,
  marginBottom: 30,
};

const tagStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "12px 16px",
  borderRadius: 16,
  fontWeight: 800,
};

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: "#e2e8f0",
  marginBottom: 26,
};

const footerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const contractWrapStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
};

const contractIconStyle: React.CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: 16,
  background: "#e0f2fe",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const smallLabelStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 14,
  marginBottom: 4,
};

const buttonStyle: React.CSSProperties = {
  padding: "18px 28px",
  border: 0,
  borderRadius: 18,
  background: "#059669",
  color: "white",
  fontWeight: 800,
  fontSize: 18,
  cursor: "pointer",
};
