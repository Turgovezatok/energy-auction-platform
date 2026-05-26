"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function BuyMarketPage() {
  const [auctions, setAuctions] = useState<any[]>([]);
  const [selectedAuction, setSelectedAuction] = useState<any | null>(null);
  const [selectedPricingModel, setSelectedPricingModel] = useState("");
  const [offerMessage, setOfferMessage] = useState("");

  useEffect(() => {
    loadAuctions();
  }, []);

  async function loadAuctions() {
    const { data, error } = await supabase
      .from("auctions")
      .select("*")
      .eq("board_type", "buy")
      .order("created_at", { ascending: false });

    if (!error && data) setAuctions(data);
  }

  function openOfferModal(auction: any) {
    setSelectedAuction(auction);
    setOfferMessage("");

    if (auction.accepts_fixed_price) setSelectedPricingModel("fixed");
    else if (auction.accepts_day_ahead_with_balancing) setSelectedPricingModel("day_ahead_adder");
    else if (auction.accepts_day_ahead_without_balancing) setSelectedPricingModel("day_ahead_no_balancing");
    else if (auction.accepts_hybrid) setSelectedPricingModel("hybrid");
  }

  async function submitOffer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!selectedAuction) return;

    const formData = new FormData(e.currentTarget);

    const fixedPrice = Number(formData.get("fixed_price_eur_mwh")) || null;
    const dayAheadAdder = Number(formData.get("day_ahead_adder_eur_mwh")) || null;
    const hybridFixedAdder = Number(formData.get("hybrid_fixed_adder_eur_mwh")) || null;
    const hybridPercent = Number(formData.get("hybrid_percent")) || null;

    if (selectedPricingModel === "fixed" && !fixedPrice) {
      setOfferMessage("Моля въведи фиксирана цена.");
      return;
    }

    if (
      (selectedPricingModel === "day_ahead_adder" ||
        selectedPricingModel === "day_ahead_no_balancing") &&
      !dayAheadAdder
    ) {
      setOfferMessage("Моля въведи добавка €/MWh.");
      return;
    }

    if (selectedPricingModel === "hybrid" && (!hybridFixedAdder || !hybridPercent)) {
      setOfferMessage("Моля въведи фиксирана част и процент.");
      return;
    }

    const year = new Date().getFullYear();
    const randomNumber = Math.floor(100000 + Math.random() * 900000);
    const offerNumber = `OFFER-${year}-${randomNumber}`;

    const { error } = await supabase.from("offers").insert({
      offer_number: offerNumber,
      offer_status: "submitted",
      submitted_at: new Date().toISOString(),
      auction_id: selectedAuction.id,
      pricing_model: selectedPricingModel,
      fixed_price_eur_mwh: fixedPrice,
      day_ahead_adder_eur_mwh: dayAheadAdder,
      hybrid_fixed_adder_eur_mwh: hybridFixedAdder,
      hybrid_percent: hybridPercent,
      payment_days: Number(formData.get("payment_days")) || null,
      offer_validity_days: Number(formData.get("offer_validity_days")) || null,
      notes: formData.get("notes"),
    });

    if (error) {
      setOfferMessage(error.message);
      return;
    }

    setOfferMessage(`Офертата е изпратена успешно ✅ Номер: ${offerNumber}`);

    setTimeout(() => {
      setSelectedAuction(null);
      setSelectedPricingModel("");
      setOfferMessage("");
    }, 1800);
  }

  return (
    <main style={pageStyle}>
      <h1 style={titleStyle}>Табло Купува</h1>

      <p style={subtitleStyle}>
        Активни заявки за покупка на електроенергия
      </p>

      <section style={gridStyle}>
        {auctions.map((auction) => (
          <article key={auction.id} style={cardStyle}>
            <div style={badgeStyle}>Скоро изтича</div>

            <h2 style={cardTitleStyle}>
              {auction.title || "Доставка на ел. енергия"}
            </h2>

            <p style={sectorStyle}>{auction.sector || "Бизнес клиент"}</p>

            <div style={infoGridStyle}>
              <InfoRow
                label="Количество"
                value={`${auction.annual_consumption_mwh || auction.quantity_mwh || 0} MWh`}
              />

              <InfoRow
                label="Период"
                value={`${formatDate(auction.delivery_start_date)} - ${formatDate(
                  auction.offer_deadline_date
                )}`}
              />

              <InfoRow
                label="Доставка"
                value={
                  auction.network_components_included
                    ? "С мрежови"
                    : "Без мрежови"
                }
              />
            </div>

            <div style={pricingBoxStyle}>
              <div style={pricingTitleStyle}>Приема ценови модели</div>

              {auction.accepts_fixed_price && (
                <PricingRow color="#2563eb">Фиксирана цена</PricingRow>
              )}

              {auction.accepts_day_ahead_with_balancing && (
                <PricingRow color="#059669">
                  Ден напред с балансиране
                </PricingRow>
              )}

              {auction.accepts_day_ahead_without_balancing && (
                <PricingRow color="#ea580c">
                  Ден напред без балансиране
                </PricingRow>
              )}

              {auction.accepts_hybrid && (
                <PricingRow color="#7c3aed">
                  Ден напред с двукомпонентна добавка
                </PricingRow>
              )}
            </div>

            <footer style={footerStyle}>
              <div>
                Край след:
                <strong> 03ч 45м</strong>
              </div>

              <button style={buttonStyle} onClick={() => openOfferModal(auction)}>
                Подай оферта
              </button>
            </footer>
          </article>
        ))}
      </section>

      {selectedAuction && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={modalTitleStyle}>Подай оферта</h2>

            <p>{selectedAuction.title}</p>

            <form onSubmit={submitOffer}>
              <div style={pricingTitleStyle}>Избери ценови модел</div>

              {selectedAuction.accepts_fixed_price && (
                <label style={radioRowStyle}>
                  <input
                    type="radio"
                    name="pricing_model"
                    value="fixed"
                    checked={selectedPricingModel === "fixed"}
                    onChange={() => setSelectedPricingModel("fixed")}
                  />
                  Фиксирана цена
                </label>
              )}

              {selectedAuction.accepts_day_ahead_with_balancing && (
                <label style={radioRowStyle}>
                  <input
                    type="radio"
                    name="pricing_model"
                    value="day_ahead_adder"
                    checked={selectedPricingModel === "day_ahead_adder"}
                    onChange={() => setSelectedPricingModel("day_ahead_adder")}
                  />
                  Ден напред с балансиране
                </label>
              )}

              {selectedAuction.accepts_day_ahead_without_balancing && (
                <label style={radioRowStyle}>
                  <input
                    type="radio"
                    name="pricing_model"
                    value="day_ahead_no_balancing"
                    checked={selectedPricingModel === "day_ahead_no_balancing"}
                    onChange={() => setSelectedPricingModel("day_ahead_no_balancing")}
                  />
                  Ден напред без балансиране
                </label>
              )}

              {selectedAuction.accepts_hybrid && (
                <label style={radioRowStyle}>
                  <input
                    type="radio"
                    name="pricing_model"
                    value="hybrid"
                    checked={selectedPricingModel === "hybrid"}
                    onChange={() => setSelectedPricingModel("hybrid")}
                  />
                  Ден напред с двукомпонентна добавка
                </label>
              )}

              {selectedPricingModel === "fixed" && (
                <input
                  name="fixed_price_eur_mwh"
                  type="number"
                  step="0.01"
                  placeholder="Фиксирана цена €/MWh"
                  style={inputStyle}
                />
              )}

              {(selectedPricingModel === "day_ahead_adder" ||
                selectedPricingModel === "day_ahead_no_balancing") && (
                <input
                  name="day_ahead_adder_eur_mwh"
                  type="number"
                  step="0.01"
                  placeholder="Добавка €/MWh"
                  style={inputStyle}
                />
              )}

              {selectedPricingModel === "hybrid" && (
                <>
                  <input
                    name="hybrid_fixed_adder_eur_mwh"
                    type="number"
                    step="0.01"
                    placeholder="Фиксирана част €/MWh"
                    style={inputStyle}
                  />

                  <input
                    name="hybrid_percent"
                    type="number"
                    step="0.01"
                    placeholder="Процент %"
                    style={inputStyle}
                  />
                </>
              )}

              <input
                name="payment_days"
                type="number"
                placeholder="Срок плащане дни"
                style={inputStyle}
              />

              <input
                name="offer_validity_days"
                type="number"
                placeholder="Валидност на офертата дни"
                style={inputStyle}
              />

              <textarea name="notes" placeholder="Бележки" style={textareaStyle} />

              {offerMessage && <div style={messageStyle}>{offerMessage}</div>}

              <div style={modalButtonsStyle}>
                <button
                  type="button"
                  style={secondaryButtonStyle}
                  onClick={() => setSelectedAuction(null)}
                >
                  Затвори
                </button>

                <button type="submit" style={buttonStyle}>
                  Изпрати оферта
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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

function PricingRow({
  children,
  color,
}: {
  children: React.ReactNode;
  color: string;
}) {
  return (
    <div style={pricingRowStyle}>
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          background: color,
        }}
      />
      <span>{children}</span>
    </div>
  );
}

function formatDate(date: string) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("bg-BG");
}

const pageStyle: React.CSSProperties = {
  padding: 40,
  background: "#f3f6fb",
  minHeight: "100vh",
};

const titleStyle: React.CSSProperties = {
  fontSize: 54,
  fontWeight: 800,
  marginBottom: 12,
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 24,
  color: "#64748b",
  marginBottom: 40,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, 520px)",
  gap: 24,
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 28,
  padding: 28,
  boxShadow: "0 4px 20px rgba(15,23,42,0.05)",
};

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  padding: "10px 18px",
  background: "#fef3c7",
  color: "#c2410c",
  borderRadius: 999,
  fontWeight: 700,
  marginBottom: 24,
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: 36,
  fontWeight: 800,
};

const sectorStyle: React.CSSProperties = {
  fontSize: 24,
  marginBottom: 28,
};

const infoGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 18,
  marginBottom: 24,
};

const infoRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  paddingBottom: 12,
  borderBottom: "1px solid #e2e8f0",
};

const pricingBoxStyle: React.CSSProperties = {
  marginTop: 24,
};

const pricingTitleStyle: React.CSSProperties = {
  marginBottom: 16,
  color: "#64748b",
};

const pricingRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: 16,
  background: "#f8fafc",
  borderRadius: 16,
  marginBottom: 12,
  fontWeight: 600,
};

const footerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 24,
  paddingTop: 20,
  borderTop: "1px solid #e2e8f0",
};

const buttonStyle: React.CSSProperties = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 16,
  padding: "14px 24px",
  fontWeight: 700,
  cursor: "pointer",
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 999,
};

const modalStyle: React.CSSProperties = {
  width: 700,
  background: "#fff",
  borderRadius: 28,
  padding: 32,
  maxHeight: "90vh",
  overflowY: "auto",
  boxSizing: "border-box",
};

const modalTitleStyle: React.CSSProperties = {
  fontSize: 42,
  fontWeight: 800,
  marginBottom: 16,
};

const radioRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "12px 14px",
  background: "#f8fafc",
  borderRadius: 14,
  marginBottom: 10,
  fontWeight: 700,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 16,
  borderRadius: 16,
  border: "1px solid #cbd5e1",
  marginTop: 16,
  marginBottom: 8,
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 120,
  padding: 16,
  borderRadius: 16,
  border: "1px solid #cbd5e1",
  marginTop: 16,
  boxSizing: "border-box",
};

const modalButtonsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  marginTop: 24,
};

const secondaryButtonStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #cbd5e1",
  borderRadius: 16,
  padding: "14px 24px",
  fontWeight: 700,
  cursor: "pointer",
};

const messageStyle: React.CSSProperties = {
  marginTop: 20,
  color: "#059669",
  fontWeight: 700,
};
