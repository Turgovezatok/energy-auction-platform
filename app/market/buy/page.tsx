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

    if (data) {
      setAuctions(data);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f1f5f9",
        padding: 40,
        fontFamily: "Arial",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 30,
        }}
      >
        <div>
          <h1 style={{ fontSize: 42, marginBottom: 6 }}>
            Табло Купува
          </h1>

          <p style={{ color: "#64748b" }}>
            Активни заявки за покупка на електроенергия
          </p>
        </div>

        <div
          style={{
            background: "white",
            padding: "12px 18px",
            borderRadius: 14,
            fontWeight: 700,
          }}
        >
          {auctions.length} активни търга
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(380px,1fr))",
          gap: 24,
        }}
      >
        {auctions.map((auction) => (
          <div
            key={auction.id}
            style={{
              background: "white",
              borderRadius: 24,
              padding: 28,
              boxShadow: "0 12px 35px rgba(15,23,42,0.08)",
              border: "1px solid #e2e8f0",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 18,
              }}
            >
              <span
                style={{
                  background: "#dcfce7",
                  color: "#166534",
                  padding: "6px 12px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                АКТИВЕН
              </span>

              <span
                style={{
                  color: "#64748b",
                  fontSize: 14,
                }}
              >
                {auction.duration_months} месеца
              </span>
            </div>

            {/* Title */}
            <h2
              style={{
                fontSize: 24,
                marginBottom: 10,
              }}
            >
              {auction.title}
            </h2>

            <p
              style={{
                color: "#64748b",
                marginBottom: 22,
              }}
            >
              {auction.sector}
            </p>

            {/* Metrics */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <Metric
                label="Консумация"
                value={`${auction.annual_consumption_mwh || 0} MWh`}
              />

              <Metric
                label="Плащане"
                value={`${auction.preferred_payment_days || "-"} дни`}
              />

              <Metric
                label="Начало"
                value={auction.delivery_start_date || "-"}
              />

              <Metric
                label="Оферти до"
                value={auction.offer_deadline_date || "-"}
              />
            </div>

            {/* Tags */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 22,
              }}
            >
              {auction.accepts_fixed_price && (
                <Tag text="Фиксирана цена" color="#dbeafe" />
              )}

              {auction.accepts_day_ahead_with_balancing && (
                <Tag text="DA + балансиране" color="#dcfce7" />
              )}

              {auction.accepts_day_ahead_without_balancing && (
                <Tag text="Без небаланс" color="#fef3c7" />
              )}

              {auction.accepts_hybrid && (
                <Tag text="Хибриден модел" color="#ede9fe" />
              )}

              {auction.has_pv && (
                <Tag text="Prosumer / ФЕЦ" color="#fce7f3" />
              )}

              {auction.network_components_included && (
                <Tag text="С мрежови" color="#e0f2fe" />
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#64748b",
                  }}
                >
                  Тип договор
                </div>

                <strong>
                  {auction.contract_type === "closed"
                    ? "Затворен"
                    : "Отворен"}
                </strong>
              </div>

              <button
                style={{
                  padding: "14px 20px",
                  borderRadius: 14,
                  border: 0,
                  background: "#059669",
                  color: "white",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Подай оферта
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        background: "#f8fafc",
        borderRadius: 16,
        padding: 16,
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: "#64748b",
          marginBottom: 6,
        }}
      >
        {label}
      </div>

      <strong>{value}</strong>
    </div>
  );
}

function Tag({
  text,
  color,
}: {
  text: string;
  color: string;
}) {
  return (
    <span
      style={{
        background: color,
        padding: "8px 12px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      {text}
    </span>
  );
}
