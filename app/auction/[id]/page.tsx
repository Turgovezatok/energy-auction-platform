"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function AuctionDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const [auction, setAuction] = useState<any>(null);
  const [invoice, setInvoice] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [capture, setCapture] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuction();
  }, []);

  async function loadAuction() {
    try {
      const { data: auctionData, error: auctionError } = await supabase
        .from("auctions")
        .select("*")
        .eq("id", params.id)
        .single();

      if (auctionError || !auctionData) {
        alert("Не успяхме да заредим търга.");
        setLoading(false);
        return;
      }

      setAuction(auctionData);

      if (auctionData.source_invoice_id) {
        const { data: invoiceData } = await supabase
          .from("invoice_uploads")
          .select("*")
          .eq("id", auctionData.source_invoice_id)
          .single();

        setInvoice(invoiceData);

        const { data: profileData } = await supabase
          .from("invoice_load_profiles")
          .select("*")
          .eq("invoice_id", auctionData.source_invoice_id)
          .single();

        setProfile(profileData);

        const response = await fetch("/api/calculate-capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoiceId: auctionData.source_invoice_id,
          }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          setCapture(result.capture);
        }
      }
    } catch (error) {
      alert(
        "Грешка при зареждане:\n\n" +
          (error instanceof Error ? error.message : String(error))
      );
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <main style={pageStyle}>
        <h1>Зареждане...</h1>
      </main>
    );
  }

  if (!auction) {
    return (
      <main style={pageStyle}>
        <h1>Търгът не е намерен</h1>
      </main>
    );
  }

  const paidPrice = Number(invoice?.paid_energy_price || 0);
  const expectedCapture = Number(capture?.expected_capture_price_eur_mwh || 0);
  const supplierAlpha =
    paidPrice && expectedCapture ? paidPrice - expectedCapture : null;
  const supplierAlphaPercent =
    supplierAlpha !== null && expectedCapture
      ? (supplierAlpha / expectedCapture) * 100
      : null;

  const currency =
    invoice?.paid_energy_currency || capture?.currency || "";

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <a href="/my-auctions" style={backLinkStyle}>
          ← Назад към моите търгове
        </a>

        <section style={heroCardStyle}>
          <div>
            <div style={badgeStyle}>Активен търг</div>

            <h1 style={{ marginBottom: 8 }}>
              {auction.title || "Търг за електроенергия"}
            </h1>

            <p style={mutedStyle}>Номер: {auction.auction_number || "—"}</p>
          </div>

          <div style={heroMetricStyle}>
            <span>Количество</span>
            <strong>{auction.quantity_mwh || "—"} MWh</strong>
          </div>
        </section>

        <section style={gridStyle}>
          <Info label="Тип" value={auction.board_type === "buy" ? "Покупка" : "Продажба"} />
          <Info label="Период" value={`${auction.duration_months || "—"} месеца`} />
          <Info label="Начало доставка" value={auction.delivery_start || "—"} />
          <Info label="Краен срок оферти" value={auction.offer_deadline || "—"} />
          <Info label="Текущ доставчик" value={auction.current_supplier || "—"} />
          <Info label="Мрежови компоненти" value={auction.network_component ? "Да" : "Не"} />
          <Info label="Батерия" value={auction.has_battery ? "Да" : "Не"} />
          <Info
            label="Капацитет батерия"
            value={auction.has_battery ? `${auction.battery_capacity_kwh || "—"} kWh` : "—"}
          />
        </section>

        {invoice && (
          <section style={cardStyle}>
            <h2>Данни от фактурата</h2>

            <div style={gridStyle}>
              <Info label="Фирма" value={invoice.customer_name || "—"} />
              <Info label="ЕИК" value={invoice.customer_eik || "—"} />
              <Info label="Фактура №" value={invoice.invoice_number || "—"} />
              <Info label="Период" value={invoice.reporting_period || "—"} />
              <Info
                label="Месечно потребление"
                value={`${invoice.total_consumption_mwh || "—"} MWh`}
              />
              <Info
                label="Платена цена енергия"
                value={
                  invoice.paid_energy_price
                    ? `${invoice.paid_energy_price} ${currency}/MWh`
                    : "—"
                }
              />
              <Info
                label="Платена стойност енергия"
                value={
                  invoice.paid_energy_total
                    ? `${invoice.paid_energy_total} ${currency}`
                    : "—"
                }
              />
              <Info
                label="Общо активна енергия"
                value={
                  invoice.total_energy_kwh
                    ? `${invoice.total_energy_kwh} kWh`
                    : "—"
                }
              />
            </div>
          </section>
        )}

        {profile && (
          <section style={cardStyle}>
            <h2>Load Profile</h2>

            <div style={gridStyle}>
              <Info
                label="Дневен дял"
                value={`${(Number(profile.day_share || 0) * 100).toFixed(1)}%`}
              />
              <Info
                label="Нощен дял"
                value={`${(Number(profile.night_share || 0) * 100).toFixed(1)}%`}
              />
              <Info
                label="Среден дневен товар"
                value={`${Number(profile.avg_day_load_kw || 0).toFixed(2)} kW`}
              />
              <Info
                label="Среден нощен товар"
                value={`${Number(profile.avg_night_load_kw || 0).toFixed(2)} kW`}
              />
              <Info
                label="Day/Night ratio"
                value={`${Number(profile.day_night_load_ratio || 0).toFixed(2)}`}
              />
              <Info label="Профил" value={profile.profile_type || "—"} />
              <Info label="Качество" value={profile.profile_quality || "—"} />
              <Info label="Риск" value={profile.risk_level || "—"} />
            </div>

            <div style={barBoxStyle}>
              <ProfileBar label="Дневна консумация" value={Number(profile.day_share || 0)} />
              <ProfileBar label="Нощна консумация" value={Number(profile.night_share || 0)} />
            </div>
          </section>
        )}

        {capture ? (
          <section style={riskCardStyle}>
            <h2>Capture & Risk Analysis</h2>

            <div style={gridStyle}>
              <Info label="Пазарен месец" value={`${capture.month}/${capture.year}`} />
              <Info label="Base price" value={`${capture.market_base_price_eur_mwh} ${currency}/MWh`} />
              <Info label="Peak price" value={`${capture.market_peak_price_eur_mwh} ${currency}/MWh`} />
              <Info label="Off-peak price" value={`${capture.market_offpeak_price_eur_mwh} ${currency}/MWh`} />
              <Info label="Expected capture" value={`${capture.expected_capture_price_eur_mwh} ${currency}/MWh`} />
              <Info label="Estimated market energy cost" value={`${capture.estimated_energy_cost_eur} ${currency}`} />
              <Info label="Risk score" value={`${capture.risk_score}/100`} />
              <Info label="Recommended model" value={capture.recommended_pricing_model} />
            </div>

            {invoice && (
              <div style={benchmarkCardStyle}>
                <h3>Paid Price vs Expected Capture</h3>

                <div style={gridStyle}>
                  <Info
                    label="Реално платена цена"
                    value={
                      paidPrice
                        ? `${paidPrice.toFixed(2)} ${currency}/MWh`
                        : "—"
                    }
                  />
                  <Info
                    label="Expected capture"
                    value={
                      expectedCapture
                        ? `${expectedCapture.toFixed(2)} ${currency}/MWh`
                        : "—"
                    }
                  />
                  <Info
                    label="Supplier Alpha"
                    value={
                      supplierAlpha !== null
                        ? `${supplierAlpha.toFixed(2)} ${currency}/MWh`
                        : "—"
                    }
                  />
                  <Info
                    label="Разлика %"
                    value={
                      supplierAlphaPercent !== null
                        ? `${supplierAlphaPercent.toFixed(1)}%`
                        : "—"
                    }
                  />
                </div>

                <p style={mutedStyle}>
                  Ако Supplier Alpha е отрицателен, клиентът е платил под
                  профилната борсова стойност. Ако е положителен, клиентът е
                  платил над очаквания capture за своя товар.
                </p>
              </div>
            )}

            <div style={riskSummaryStyle}>
              <strong>Risk level: {capture.risk_level}</strong>
              <p>
                Профил: {capture.profile_type}. Данните са базирани на тарифна
                структура от фактурата и исторически пазарни цени.
              </p>
            </div>
          </section>
        ) : (
          <section style={cardStyle}>
            <h2>Capture анализ</h2>
            <p style={mutedStyle}>
              Няма наличен capture анализ. Проверете дали има пазарни данни за
              месеца и годината на фактурата.
            </p>
          </section>
        )}

        <section style={cardStyle}>
          <h2>Бележки</h2>
          <p style={mutedStyle}>{auction.notes || "—"}</p>
        </section>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div style={infoBoxStyle}>
      <span style={infoLabelStyle}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProfileBar({ label, value }: { label: string; value: number }) {
  const percent = Math.max(0, Math.min(100, value * 100));

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>{label}</span>
        <strong>{percent.toFixed(1)}%</strong>
      </div>

      <div style={barTrackStyle}>
        <div style={{ ...barFillStyle, width: `${percent}%` }} />
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f3f6fb",
  padding: 40,
  fontFamily: "Arial",
};

const containerStyle: React.CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
};

const backLinkStyle: React.CSSProperties = {
  display: "inline-block",
  marginBottom: 20,
  color: "#2563eb",
  textDecoration: "none",
  fontWeight: 700,
};

const heroCardStyle: React.CSSProperties = {
  background: "linear-gradient(135deg,#064e3b,#0369a1)",
  color: "white",
  padding: 32,
  borderRadius: 28,
  display: "flex",
  justifyContent: "space-between",
  gap: 24,
  alignItems: "center",
  boxShadow: "0 20px 60px rgba(15,23,42,0.25)",
};

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  padding: "8px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.18)",
  fontWeight: 700,
  marginBottom: 12,
};

const heroMetricStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.16)",
  padding: 22,
  borderRadius: 22,
  minWidth: 220,
  textAlign: "center",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
  marginTop: 18,
};

const cardStyle: React.CSSProperties = {
  background: "white",
  padding: 28,
  borderRadius: 24,
  boxShadow: "0 14px 40px rgba(15,23,42,0.08)",
  marginTop: 26,
};

const riskCardStyle: React.CSSProperties = {
  ...cardStyle,
  border: "1px solid #bbf7d0",
  background: "#f0fdf4",
};

const benchmarkCardStyle: React.CSSProperties = {
  marginTop: 24,
  padding: 22,
  borderRadius: 20,
  background: "white",
  border: "1px solid #86efac",
};

const infoBoxStyle: React.CSSProperties = {
  padding: 16,
  borderRadius: 16,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const infoLabelStyle: React.CSSProperties = {
  display: "block",
  color: "#64748b",
  fontSize: 13,
  marginBottom: 6,
};

const mutedStyle: React.CSSProperties = {
  color: "#64748b",
  lineHeight: 1.6,
};

const barBoxStyle: React.CSSProperties = {
  marginTop: 24,
};

const barTrackStyle: React.CSSProperties = {
  height: 14,
  background: "#e2e8f0",
  borderRadius: 999,
  marginTop: 8,
  overflow: "hidden",
};

const barFillStyle: React.CSSProperties = {
  height: "100%",
  background: "#059669",
  borderRadius: 999,
};

const riskSummaryStyle: React.CSSProperties = {
  marginTop: 22,
  padding: 20,
  borderRadius: 18,
  background: "white",
  border: "1px solid #bbf7d0",
};
