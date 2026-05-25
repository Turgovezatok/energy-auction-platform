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
          <p style={subtitleStyle}>
            Активни заявки за покупка на електроенергия
          </p>
        </div>

        <div style={counterStyle}>📊 {auctions.length} активни търга</div>
      </header>

      <div style={topLinkStyle}>Виж всички →</div>

      <section style={gridStyle}>
        {auctions.map((auction) => (
          <article key={auction.id} style={cardStyle}>
            <div style={cardTopStyle}>
              <span style={statusBadgeStyle}>Скоро изтича</span>
              <span style={heartStyle}>♡</span>
            </div>

            <div style={mainRowStyle}>
              <div style={iconBoxStyle}>🛒</div>

              <div>
                <h2 style={cardTitleStyle}>
                  {auction.title || "Доставка на ел. енергия"}
                </h2>

                <p style={companyStyle}>
                  {auction.sector || "Бизнес клиент"} 🔵
                </p>
              </div>
            </div>

            <div style={detailsStyle}>
              <InfoRow
                label="Количество"
                value={`${auction.annual_consumption_mwh || 0} MWh`}
              />

              <InfoRow
                label="Период"
                value={`${auction.delivery_start_date || "-"} - ${
                  auction.offer_deadline_date || "-"
                }`}
              />

              <InfoRow
                label="Доставка"
                value={
                  auction.network_components_included
                    ? "С мрежови"
                    : "Енергия"
                }
              />
            </div>

            <div style={priceBlockStyle}>
  <div style={priceLabelStyle}>Приема ценови модели</div>

  <div style={priceTableStyle}>
    {auction.accepts_fixed_price && (
      <PriceRow label="Фиксирана цена" color="#1d4ed8" />
    )}

    {auction.accepts_day_ahead_with_balancing && (
      <PriceRow label="Ден напред с балансиране" color="#047857" />
    )}

    {auction.accepts_day_ahead_without_balancing && (
      <PriceRow label="Ден напред без балансиране" color="#b45309" />
    )}

    {auction.accepts_hybrid && (
      <PriceRow label="Ден напред с двукомпонентна добавка" color="#6d28d9" />
    )}
  </div>
</div>

            <footer style={footerStyle}>
              <span>Край след:</span>
              <strong>{auction.duration_months} м.</strong>
            </footer>
          </article>
        ))}
      </section>

      {auctions.length === 0 && (
        <p style={{ color: "#64748b" }}>Няма активни търгове.</p>
      )}
    </main>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={infoRowStyle}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function PriceRow({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  return (
    <div style={priceRowStyle}>
      <span style={{ ...priceDotStyle, background: color }}></span>
      <span>{label}</span>
    </div>
  );
}
const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f8fafc",
  padding: "34px 42px",
  fontFamily: "Arial, sans-serif",
  color: "#0f172a",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 24,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 38,
  fontWeight: 800,
};

const subtitleStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 17,
  marginTop: 8,
};

const counterStyle: React.CSSProperties = {
  background: "white",
  padding: "14px 22px",
  borderRadius: 16,
  fontWeight: 800,
  boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
};

const topLinkStyle: React.CSSProperties = {
  textAlign: "right",
  color: "#2563eb",
  fontWeight: 800,
  marginBottom: 18,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(380px, 420px))",
justifyContent: "start",
  gap: 22,
};

const cardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 18,
  overflow: "hidden",
  boxShadow: "0 14px 38px rgba(15,23,42,0.08)",
  border: "1px solid #e5e7eb",
};

const cardTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "20px 22px 8px",
};

const statusBadgeStyle: React.CSSProperties = {
  background: "#ffedd5",
  color: "#c2410c",
  padding: "6px 12px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 800,
};

const heartStyle: React.CSSProperties = {
  fontSize: 28,
  color: "#64748b",
};

const mainRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 16,
  padding: "14px 22px 18px",
  alignItems: "flex-start",
};

const iconBoxStyle: React.CSSProperties = {
  width: 58,
  height: 58,
  borderRadius: 18,
  background: "#e0e7ff",
  color: "#1e3a8a",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 28,
  flexShrink: 0,
};

const cardTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 18,
  lineHeight: 1.35,
  fontWeight: 800,
};

const companyStyle: React.CSSProperties = {
  color: "#0f172a",
  marginTop: 8,
  fontSize: 14,
  fontWeight: 600,
};

const detailsStyle: React.CSSProperties = {
  padding: "8px 22px 0",
};

const infoRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "7px 0",
  color: "#475569",
  fontSize: 14,
};

const priceBlockStyle: React.CSSProperties = {
  borderTop: "1px solid #e5e7eb",
  marginTop: 12,
  padding: "16px 22px",
};

const priceLabelStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 14,
  marginBottom: 8,
};

const priceStyle: React.CSSProperties = {
  color: "#059669",
  fontSize: 21,
  fontWeight: 900,
};

const footerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  background: "#fff7ed",
  color: "#c2410c",
  padding: "14px 22px",
  fontSize: 14,
};
const priceTableStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
};

const priceRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "#f8fafc",
  padding: "9px 10px",
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 700,
  color: "#334155",
};

const priceDotStyle: React.CSSProperties = {
  width: 9,
  height: 9,
  borderRadius: "50%",
  flexShrink: 0,
};
