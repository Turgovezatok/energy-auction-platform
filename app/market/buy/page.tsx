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
        <div style={counterStyle}>📊 {auctions.length} активни търга</div>
      </header>

      <div style={tabsStyle}>
        <button style={activeTabStyle}>🛒 Купува</button>
        <button style={tabStyle}>📈 Продава</button>
      </div>

      <div style={filtersStyle}>
        <button style={activeFilterStyle}>Всички</button>
        <button style={filterStyle}>🔵 Фиксирана цена</button>
        <button style={filterStyle}>🟢 Ден напред с балансиране</button>
        <button style={filterStyle}>🟠 Ден напред без балансиране</button>
        <button style={filterStyle}>🟣 Ден напред с двукомпонентна добавка</button>
      </div>

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
                  {auction.title || "Доставка на ел. енергия за търговски обект"}
                </h2>
                <p style={companyStyle}>{auction.sector || "Бизнес клиент"} 🔵</p>
              </div>
            </div>

            <div style={middleGridStyle}>
              <div>
                <InfoRow label="Количество" value={`${auction.annual_consumption_mwh || 0} MWh`} />
                <InfoRow
                  label="Период"
                  value={`${formatDate(auction.delivery_start_date)} - ${formatDate(auction.offer_deadline_date)}`}
                />
                <InfoRow
                  label="Доставка"
                  value={auction.network_components_included ? "С мрежови" : "Енергия"}
                />
              </div>

              <div style={priceModelsStyle}>
                <div style={priceTitleStyle}>Приема ценови модели</div>

                {auction.accepts_fixed_price && (
                  <PriceRow label="Фиксирана цена" color="#2563eb" />
                )}
                {auction.accepts_day_ahead_with_balancing && (
                  <PriceRow label="Ден напред с балансиране" color="#059669" />
                )}
                {auction.accepts_day_ahead_without_balancing && (
                  <PriceRow label="Ден напред без балансиране" color="#ea580c" />
                )}
                {auction.accepts_hybrid && (
                  <PriceRow label="Ден напред с двукомпонентна добавка" color="#7c3aed" />
                )}
              </div>
            </div>

            <footer style={footerStyle}>
              <span>Край след:</span>
              <strong>03ч 45м</strong>
              <button style={buttonStyle}>Подай оферта</button>
            </footer>
          </article>
        ))}
      </section>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoRowStyle}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PriceRow({ label, color }: { label: string; color: string }) {
  return (
    <div style={priceRowStyle}>
      <span style={{ ...priceDotStyle, background: color }} />
      <span>{label}</span>
    </div>
  );
}

function formatDate(date: string) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("bg-BG");
}

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, 480px)",
  gap: 22,
  alignItems: "start",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 24,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 40,
  fontWeight: 900,
};

const subtitleStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 17,
};

const counterStyle: React.CSSProperties = {
  background: "white",
  padding: "14px 22px",
  borderRadius: 16,
  fontWeight: 800,
  boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
};

const tabsStyle: React.CSSProperties = {
  display: "flex",
  gap: 18,
  borderBottom: "1px solid #dbe3ef",
  marginBottom: 24,
};

const activeTabStyle: React.CSSProperties = {
  padding: "12px 16px",
  border: 0,
  borderBottom: "3px solid #2563eb",
  background: "#eff6ff",
  color: "#2563eb",
  fontWeight: 800,
  fontSize: 16,
};

const tabStyle: React.CSSProperties = {
  padding: "12px 16px",
  border: 0,
  background: "transparent",
  color: "#334155",
  fontWeight: 700,
  fontSize: 16,
};

const filtersStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  marginBottom: 24,
};

const activeFilterStyle: React.CSSProperties = {
  padding: "11px 16px",
  borderRadius: 10,
  border: "1px solid #2563eb",
  background: "white",
  color: "#2563eb",
  fontWeight: 700,
};

const filterStyle: React.CSSProperties = {
  padding: "11px 16px",
  borderRadius: 10,
  border: "1px solid #dbe3ef",
  background: "white",
  color: "#334155",
  fontWeight: 700,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
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
  padding: "18px 22px 6px",
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
  padding: "12px 22px 18px",
};

const iconBoxStyle: React.CSSProperties = {
  width: 58,
  height: 58,
  borderRadius: 18,
  background: "#e0e7ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 28,
  flexShrink: 0,
};

const cardTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 19,
  lineHeight: 1.35,
  fontWeight: 900,
};

const companyStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 14,
  fontWeight: 700,
};

const middleGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.1fr 1fr",
  gap: 18,
  padding: "6px 22px 20px",
};

const infoRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  padding: "8px 0",
  color: "#475569",
  fontSize: 14,
};

const priceModelsStyle: React.CSSProperties = {
  borderLeft: "1px solid #e2e8f0",
  paddingLeft: 18,
};

const priceTitleStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 13,
  marginBottom: 8,
};

const priceRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: "#f8fafc",
  padding: "7px 9px",
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 700,
  marginBottom: 7,
};

const priceDotStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  flexShrink: 0,
};

const footerStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto auto",
  alignItems: "center",
  gap: 14,
  background: "#fff7ed",
  color: "#c2410c",
  padding: "14px 22px",
  fontSize: 14,
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 9,
  border: 0,
  background: "#2563eb",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};
