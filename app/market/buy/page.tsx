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
  created_at: string;
};

export default function BuyMarketPage() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuctions();
  }, []);

  async function loadAuctions() {
    const { data, error } = await supabase
      .from("auctions")
      .select("*")
      .eq("board_type", "buy")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setAuctions(data);
    }

    setLoading(false);
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "Arial", padding: 40 }}>
      <h1 style={{ fontSize: 42, marginBottom: 10 }}>Табло Купува</h1>
      <p style={{ color: "#64748b", marginBottom: 32 }}>
        Заявки от потребители и prosumers за покупка на електроенергия.
      </p>

      {loading && <p>Зареждане...</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
        {auctions.map((auction) => (
          <div key={auction.id} style={{ background: "white", borderRadius: 22, padding: 28, boxShadow: "0 12px 35px rgba(15,23,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ background: "#dcfce7", color: "#166534", padding: "6px 10px", borderRadius: 999, fontSize: 13, fontWeight: 700 }}>
                КУПУВА
              </span>

              <span style={{ color: "#64748b", fontSize: 14 }}>
                {auction.duration_months} м.
              </span>
            </div>

            <h2 style={{ fontSize: 22, marginBottom: 10 }}>{auction.title}</h2>

            <p style={{ color: "#64748b", marginBottom: 20 }}>{auction.sector || "Без сектор"}</p>

            <div style={{ display: "grid", gap: 10, fontSize: 15 }}>
              <Info label="Годишна консумация" value={`${auction.annual_consumption_mwh || 0} MWh`} />
              <Info label="Начало доставка" value={auction.delivery_start_date || "-"} />
              <Info label="Краен срок оферти" value={auction.offer_deadline_date || "-"} />
              <Info label="ФЕЦ" value={auction.has_pv ? "Да" : "Не"} />
              <Info label="Мрежови компоненти" value={auction.network_components_included ? "Включени" : "Без"} />
              <Info label="Договор" value={auction.contract_type === "closed" ? "Затворен" : "Отворен"} />
              <Info label="Плащане" value={`${auction.preferred_payment_days || "-"} дни`} />
            </div>

            <div style={{ marginTop: 20 }}>
              <strong>Приема оферти:</strong>
              <ul style={{ color: "#475569", paddingLeft: 20 }}>
                {auction.accepts_fixed_price && <li>Фиксирана цена</li>}
                {auction.accepts_day_ahead_with_balancing && <li>Ден напред + добавка с балансиране</li>}
                {auction.accepts_day_ahead_without_balancing && <li>Ден напред + добавка без балансиране</li>}
                {auction.accepts_hybrid && <li>Хибриден модел</li>}
              </ul>
            </div>

            <button style={{ marginTop: 18, width: "100%", padding: 14, border: 0, borderRadius: 14, background: "#059669", color: "white", fontWeight: 700, fontSize: 16 }}>
              Подай оферта
            </button>
          </div>
        ))}
      </div>

      {!loading && auctions.length === 0 && <p>Все още няма активни заявки за покупка.</p>}
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", paddingBottom: 8 }}>
      <span style={{ color: "#64748b" }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
