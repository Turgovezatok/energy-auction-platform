"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

const BGN_TO_EUR = 1.95583;

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
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadAuction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function loadAuction() {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data: auctionData, error: auctionError } = await supabase
        .from("auctions")
        .select("*")
        .eq("id", params.id)
        .single();

      if (auctionError || !auctionData) {
        setAuction(null);
        setErrorMessage("Търгът не е намерен.");
        return;
      }

      setAuction(auctionData);

      if (!auctionData.source_invoice_id) return;

      const { data: invoiceData } = await supabase
        .from("invoice_uploads")
        .select("*")
        .eq("id", auctionData.source_invoice_id)
        .maybeSingle();

      setInvoice(invoiceData || null);

      const { data: profileData } = await supabase
        .from("invoice_load_profiles")
        .select("*")
        .eq("invoice_id", auctionData.source_invoice_id)
        .maybeSingle();

      setProfile(profileData || null);

      try {
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
      } catch {
        setCapture(null);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Възникна грешка при зареждане на търга."
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={containerStyle}>
          <h1>Зареждане...</h1>
        </div>
      </main>
    );
  }

  if (!auction) {
    return (
      <main style={pageStyle}>
        <div style={containerStyle}>
          <Link href="/my-auctions" style={backLinkStyle}>
            ← Назад към моите търгове
          </Link>
          <section style={cardStyle}>
            <h1>{errorMessage || "Търгът не е намерен."}</h1>
          </section>
        </div>
      </main>
    );
  }

  const paidPriceBgnMwh = normalizePaidPriceToBgnMwh(
    invoice?.paid_energy_price,
    invoice?.paid_energy_currency
  );

  const expectedCaptureEurMwh = toNumber(
    capture?.expected_capture_price_eur_mwh
  );

  const expectedCaptureBgnMwh = expectedCaptureEurMwh
    ? expectedCaptureEurMwh * BGN_TO_EUR
    : null;

  const supplierAlphaBgnMwh =
    paidPriceBgnMwh && expectedCaptureBgnMwh
      ? paidPriceBgnMwh - expectedCaptureBgnMwh
      : null;

  const supplierAlphaPercent =
    supplierAlphaBgnMwh !== null && expectedCaptureBgnMwh
      ? (supplierAlphaBgnMwh / expectedCaptureBgnMwh) * 100
      : null;

  const dayKwh = toNumber(
    profile?.day_kwh ??
      profile?.day_energy_kwh ??
      invoice?.day_energy_kwh ??
      invoice?.day_consumption_kwh ??
      invoice?.day_kwh ??
      invoice?.day_active_energy_kwh
  );

  const nightKwh = toNumber(
    profile?.night_kwh ??
      profile?.night_energy_kwh ??
      invoice?.night_energy_kwh ??
      invoice?.night_consumption_kwh ??
      invoice?.night_kwh ??
      invoice?.night_active_energy_kwh
  );

  const totalKwh =
    toNumber(invoice?.total_energy_kwh) ||
    toNumber(invoice?.total_consumption_mwh) * 1000 ||
    dayKwh + nightKwh;

  const calculatedDayShare = totalKwh > 0 ? dayKwh / totalKwh : 0;
  const calculatedNightShare = totalKwh > 0 ? nightKwh / totalKwh : 0;

  const dayShare = profile?.day_share
    ? safeShare(profile.day_share)
    : calculatedDayShare;

  const nightShare = profile?.night_share
    ? safeShare(profile.night_share)
    : calculatedNightShare;

  const avgDayLoadKw =
    toNumber(profile?.avg_day_load_kw) || calculateAverageLoad(dayKwh, 14, 28);

  const avgNightLoadKw =
    toNumber(profile?.avg_night_load_kw) ||
    calculateAverageLoad(nightKwh, 10, 28);

  const maxLoad = Math.max(avgDayLoadKw, avgNightLoadKw);

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <Link href="/my-auctions" style={backLinkStyle}>
          ← Назад към моите търгове
        </Link>

        {errorMessage && (
          <section style={warningStyle}>
            <strong>Внимание:</strong> {errorMessage}
          </section>
        )}

        <section style={heroCardStyle}>
          <div>
            <div style={badgeStyle}>{auction.status || "Активен търг"}</div>
            <h1 style={{ marginBottom: 8 }}>
              {auction.title || "Търг за електроенергия"}
            </h1>
            <p style={heroMutedStyle}>Номер: {auction.auction_number || "—"}</p>
          </div>

          <div style={heroMetricStyle}>
            <span>Количество</span>
            <strong>{formatMWh(auction.quantity_mwh)}</strong>
          </div>
        </section>

        <section style={gridStyle}>
          <Info
            label="Тип"
            value={auction.board_type === "sell" ? "Продажба" : "Покупка"}
          />
          <Info label="Период" value={formatMonths(auction.duration_months)} />
          <Info label="Начало доставка" value={auction.delivery_start || "—"} />
          <Info label="Краен срок оферти" value={auction.offer_deadline || "—"} />
          <Info label="Ценови модел" value={auction.pricing_model || "—"} />
          <Info label="Текущ доставчик" value={auction.current_supplier || "—"} />
          <Info
            label="Мрежови компоненти"
            value={auction.network_component ? "Да" : "Не"}
          />
          <Info label="Батерия" value={auction.has_battery ? "Да" : "Не"} />
        </section>

        <section style={cardStyle}>
          <h2>Данни от фактурата</h2>

          {!invoice && (
            <p style={mutedStyle}>
              Няма достатъчно данни от фактурата за пълен анализ.
            </p>
          )}

          {invoice && (
            <div style={gridStyle}>
              <Info label="Фирма" value={invoice.customer_name || "—"} />
              <Info label="ЕИК" value={invoice.customer_eik || "—"} />
              <Info label="Фактура №" value={invoice.invoice_number || "—"} />
              <Info label="Период" value={invoice.reporting_period || "—"} />
              <Info
                label="Месечно потребление"
                value={formatMWh(invoice.total_consumption_mwh)}
              />
              <Info
                label="Платена цена енергия"
                value={formatBGNPerMWh(paidPriceBgnMwh)}
              />
              <Info
                label="Платена цена енергия"
                value={formatEURPerMWh(convertBGNtoEUR(paidPriceBgnMwh))}
              />
              <Info
                label="Общо активна енергия"
                value={formatKWh(invoice.total_energy_kwh)}
              />
            </div>
          )}
        </section>

        <section style={cardStyle}>
          <h2>Day / Night визуализация</h2>

          {!profile && (
            <p style={mutedStyle}>
              Няма записан load profile, но системата изчислява дневен и нощен
              профил от данните във фактурата, ако са налични.
            </p>
          )}

          {(profile || dayKwh || nightKwh) ? (
            <>
              <div style={gridStyle}>
                <Info label="Дневна енергия" value={formatKWh(dayKwh)} />
                <Info label="Нощна енергия" value={formatKWh(nightKwh)} />
                <Info label="Дневен дял" value={formatPercent(dayShare)} />
                <Info label="Нощен дял" value={formatPercent(nightShare)} />
                <Info
                  label="Среден дневен товар"
                  value={formatKW(avgDayLoadKw)}
                />
                <Info
                  label="Среден нощен товар"
                  value={formatKW(avgNightLoadKw)}
                />
                <Info
                  label="Day/Night ratio"
                  value={
                    nightKwh > 0
                      ? formatNumber(dayKwh / nightKwh)
                      : formatNumber(profile?.day_night_load_ratio)
                  }
                />
                <Info label="Профил" value={profile?.profile_type || "—"} />
                <Info label="Качество" value={profile?.profile_quality || "—"} />
                <Info label="Риск" value={profile?.risk_level || "—"} />
              </div>

              <div style={profileVisualStyle}>
                <div style={stackedBarStyle}>
                  <div style={{ ...dayBarStyle, width: `${dayShare * 100}%` }}>
                    Дневна {formatPercent(dayShare)}
                  </div>
                  <div
                    style={{ ...nightBarStyle, width: `${nightShare * 100}%` }}
                  >
                    Нощна {formatPercent(nightShare)}
                  </div>
                </div>

                <div style={barBoxStyle}>
                  <LoadBar
                    label="Среден дневен товар"
                    value={avgDayLoadKw}
                    maxValue={maxLoad}
                    unit="kW"
                  />

                  <LoadBar
                    label="Среден нощен товар"
                    value={avgNightLoadKw}
                    maxValue={maxLoad}
                    unit="kW"
                  />
                </div>
              </div>
            </>
          ) : (
            <p style={mutedStyle}>
              Не са открити отделни стойности за дневна и нощна енергия във
              фактурата.
            </p>
          )}
        </section>

        <section style={riskCardStyle}>
          <h2>Capture анализ</h2>

          {!capture && (
            <p style={mutedStyle}>
              Няма наличен capture анализ. Провери дали има пазарни данни за
              месеца и годината на фактурата.
            </p>
          )}

          {capture && (
            <>
              <div style={gridStyle}>
                <Info
                  label="Пазарен месец"
                  value={`${capture.month || "—"}/${capture.year || "—"}`}
                />
                <Info
                  label="Base price"
                  value={formatEURPerMWh(capture.market_base_price_eur_mwh)}
                />
                <Info
                  label="Peak price"
                  value={formatEURPerMWh(capture.market_peak_price_eur_mwh)}
                />
                <Info
                  label="Off-peak price"
                  value={formatEURPerMWh(capture.market_offpeak_price_eur_mwh)}
                />
                <Info
                  label="Expected capture"
                  value={formatEURPerMWh(capture.expected_capture_price_eur_mwh)}
                />
                <Info
                  label="Expected capture"
                  value={formatBGNPerMWh(expectedCaptureBgnMwh)}
                />
                <Info
                  label="Estimated market energy cost"
                  value={formatEUR(capture.estimated_energy_cost_eur)}
                />
                <Info
                  label="Risk score"
                  value={`${capture.risk_score || "—"}/100`}
                />
                <Info
                  label="Recommended model"
                  value={capture.recommended_pricing_model || "—"}
                />
              </div>

              <div style={benchmarkCardStyle}>
                <h3>Paid Price vs Expected Capture</h3>

                <div style={gridStyle}>
                  <Info
                    label="Реално платена цена"
                    value={formatBGNPerMWh(paidPriceBgnMwh)}
                  />
                  <Info
                    label="Expected capture"
                    value={formatBGNPerMWh(expectedCaptureBgnMwh)}
                  />
                  <Info
                    label="Supplier Alpha"
                    value={formatBGNPerMWh(supplierAlphaBgnMwh)}
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

              <div style={riskSummaryStyle}>
                <strong>Risk level: {capture.risk_level || "—"}</strong>
                <p>
                  Профил: {capture.profile_type || "—"}. Данните са базирани на
                  тарифна структура от фактурата и исторически пазарни цени.
                </p>
              </div>
            </>
          )}
        </section>

        <section style={cardStyle}>
          <h2>Бележки</h2>
          <p style={mutedStyle}>{auction.notes || "—"}</p>
        </section>
      </div>
    </main>
  );
}

function normalizePaidPriceToBgnMwh(price: any, currency: any) {
  let value = toNumber(price);
  if (!value) return null;

  if (value < 10) value = value * 1000;

  const normalizedCurrency = String(currency || "BGN").toUpperCase();

  if (normalizedCurrency.includes("EUR")) {
    return value * BGN_TO_EUR;
  }

  return value;
}

function calculateAverageLoad(kwh: number, hoursPerDay: number, days: number) {
  if (!kwh || !hoursPerDay || !days) return 0;
  return kwh / (hoursPerDay * days);
}

function toNumber(value: any) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function safeShare(value: any) {
  const number = toNumber(value);
  if (number > 1) return Math.min(1, number / 100);
  return Math.max(0, Math.min(1, number));
}

function convertBGNtoEUR(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return value / BGN_TO_EUR;
}

function formatBGN(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toLocaleString("bg-BG", {
    maximumFractionDigits: 2,
  })} лв.`;
}

function formatEUR(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toLocaleString("bg-BG", {
    maximumFractionDigits: 2,
  })} €`;
}

function formatBGNPerMWh(value?: number | null) {
  const formatted = formatBGN(value);
  return formatted === "—" ? "—" : `${formatted}/MWh`;
}

function formatEURPerMWh(value?: number | null) {
  const formatted = formatEUR(value);
  return formatted === "—" ? "—" : `${formatted}/MWh`;
}

function formatKWh(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return `${Number(value).toLocaleString("bg-BG", {
    maximumFractionDigits: 0,
  })} kWh`;
}

function formatMWh(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return `${Number(value).toLocaleString("bg-BG", {
    maximumFractionDigits: 2,
  })} MWh`;
}

function formatKW(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return `${Number(value).toLocaleString("bg-BG", {
    maximumFractionDigits: 2,
  })} kW`;
}

function formatPercent(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return `${(Number(value) * 100).toFixed(1)}%`;
}

function formatNumber(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return Number(value).toLocaleString("bg-BG", {
    maximumFractionDigits: 2,
  });
}

function formatMonths(value?: number | null) {
  if (!value) return "—";
  return `${value} месеца`;
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div style={infoBoxStyle}>
      <span style={infoLabelStyle}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LoadBar({
  label,
  value,
  maxValue,
  unit,
}: {
  label: string;
  value: number;
  maxValue: number;
  unit: string;
}) {
  const percent =
    maxValue > 0 ? Math.max(0, Math.min(100, (value / maxValue) * 100)) : 0;

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>{label}</span>
        <strong>
          {value.toFixed(2)} {unit}
        </strong>
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
  fontFamily: "Arial, sans-serif",
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

const warningStyle: React.CSSProperties = {
  background: "#fff7ed",
  border: "1px solid #fdba74",
  color: "#9a3412",
  padding: 16,
  borderRadius: 16,
  marginBottom: 20,
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

const heroMutedStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.78)",
  lineHeight: 1.6,
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

const profileVisualStyle: React.CSSProperties = {
  marginTop: 26,
  padding: 20,
  borderRadius: 18,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const stackedBarStyle: React.CSSProperties = {
  display: "flex",
  width: "100%",
  height: 42,
  borderRadius: 999,
  overflow: "hidden",
  marginTop: 14,
  background: "#e2e8f0",
};

const dayBarStyle: React.CSSProperties = {
  background: "#059669",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 800,
  fontSize: 13,
};

const nightBarStyle: React.CSSProperties = {
  background: "#2563eb",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 800,
  fontSize: 13,
};

const riskSummaryStyle: React.CSSProperties = {
  marginTop: 22,
  padding: 20,
  borderRadius: 18,
  background: "white",
  border: "1px solid #bbf7d0",
};
