"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../../lib/supabase";

const BGN_TO_EUR = 1.95583;

export default function AuctionBidsPage({
  params,
}: {
  params: { id: string };
}) {
  const [auction, setAuction] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function loadData() {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data: auctionData, error: auctionError } = await supabase
        .from("auctions")
        .select("*")
        .eq("id", params.id)
        .single();

      if (auctionError || !auctionData) {
        setErrorMessage("Търгът не е намерен.");
        setAuction(null);
        return;
      }

      setAuction(auctionData);

      const { data: bidData, error: bidError } = await supabase
        .from("auction_bids")
        .select("*")
        .eq("auction_id", params.id)
        .order("created_at", { ascending: false });

      if (bidError) {
        setErrorMessage("Възникна грешка при зареждане на офертите.");
        setBids([]);
        return;
      }

      setBids(bidData || []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Възникна грешка при зареждане."
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

  const bestBid = findBestBid(bids);

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <Link href="/my-auctions" style={backLinkStyle}>
          ← Назад към моите търгове
        </Link>

        <section style={heroCardStyle}>
          <div>
            <div style={badgeStyle}>Оферти към търг</div>
            <h1 style={{ marginBottom: 8 }}>
              {auction.title || "Търг за електроенергия"}
            </h1>
            <p style={heroMutedStyle}>Номер: {auction.auction_number || "—"}</p>
          </div>

          <div style={heroActionsStyle}>
            <Link href={`/auction/${params.id}`} style={secondaryButtonStyle}>
              Детайли
            </Link>

            <Link
              href={`/auction/${params.id}/submit-bid`}
              style={primaryButtonStyle}
            >
              Подай оферта
            </Link>
          </div>
        </section>

        {errorMessage && (
          <section style={warningStyle}>
            <strong>Внимание:</strong> {errorMessage}
          </section>
        )}

        <section style={gridStyle}>
          <Info label="Брой оферти" value={bids.length} />
          <Info
            label="Най-добра цена"
            value={
              bestBid?.fixed_price_bgn_mwh
                ? formatBGNPerMWh(bestBid.fixed_price_bgn_mwh)
                : "—"
            }
          />
          <Info
            label="Най-добър доставчик"
            value={bestBid?.supplier_name || "—"}
          />
          <Info
            label="Количество"
            value={formatMWh(auction.quantity_mwh)}
          />
        </section>

        {bids.length === 0 ? (
          <section style={cardStyle}>
            <h2>Няма подадени оферти</h2>
            <p style={mutedStyle}>
              Все още няма оферти от доставчици за този търг.
            </p>

            <Link
              href={`/auction/${params.id}/submit-bid`}
              style={primaryInlineButtonStyle}
            >
              Подай първата оферта
            </Link>
          </section>
        ) : (
          <section style={cardStyle}>
            <h2>Оферти от доставчици</h2>

            <div style={bidListStyle}>
              {bids.map((bid) => {
                const isBest = bestBid?.id === bid.id;

                return (
                  <article
                    key={bid.id}
                    style={{
                      ...bidCardStyle,
                      ...(isBest ? bestBidCardStyle : {}),
                    }}
                  >
                    <div style={bidHeaderStyle}>
                      <div>
                        <div style={bidNumberStyle}>
                          {bid.bid_number || "Оферта без номер"}
                        </div>
                        <h3 style={{ margin: "6px 0" }}>
                          {bid.supplier_name || "Доставчик"}
                        </h3>
                        <p style={mutedStyle}>
                          {bid.contact_person || "—"}{" "}
                          {bid.supplier_email ? `• ${bid.supplier_email}` : ""}
                        </p>
                      </div>

                      <div style={statusBadgeStyle}>
                        {isBest ? "Най-добра" : bid.status || "submitted"}
                      </div>
                    </div>

                    <div style={gridStyle}>
                      <Info
                        label="Дата на оферта"
                        value={formatDate(bid.bid_date)}
                      />
                      <Info
                        label="Валидна до"
                        value={formatDate(bid.valid_until)}
                      />
                      <Info
                        label="Ценови модел"
                        value={translatePricingModel(bid.pricing_model)}
                      />
                      <Info
                        label="Фиксирана цена"
                        value={formatBGNPerMWh(bid.fixed_price_bgn_mwh)}
                      />
                      <Info
                        label="Фиксирана цена"
                        value={formatEURPerMWh(
                          convertBGNtoEUR(bid.fixed_price_bgn_mwh)
                        )}
                      />
                      <Info
                        label="Day-ahead добавка"
                        value={formatBGNPerMWh(bid.day_ahead_adder_bgn_mwh)}
                      />
                      <Info
                        label="Балансиране"
                        value={formatBGNPerMWh(bid.balancing_adder_bgn_mwh)}
                      />
                      <Info
                        label="Прогнозна обща стойност"
                        value={formatBGN(bid.estimated_total_bgn)}
                      />
                      <Info
                        label="Прогнозна икономия"
                        value={formatBGN(bid.estimated_savings_bgn)}
                      />
                      <Info
                        label="Срок договор"
                        value={formatMonths(bid.contract_duration_months)}
                      />
                      <Info
                        label="Мрежови компоненти"
                        value={bid.includes_network_components ? "Да" : "Не"}
                      />
                      <Info
                        label="ДДС включено"
                        value={bid.vat_included ? "Да" : "Не"}
                      />
                    </div>

                    {bid.notes && (
                      <div style={notesStyle}>
                        <strong>Бележки:</strong>
                        <p>{bid.notes}</p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function findBestBid(bids: any[]) {
  const validFixedBids = bids.filter((bid) => Number(bid.fixed_price_bgn_mwh) > 0);

  if (validFixedBids.length === 0) return null;

  return validFixedBids.sort(
    (a, b) => Number(a.fixed_price_bgn_mwh) - Number(b.fixed_price_bgn_mwh)
  )[0];
}

function translatePricingModel(model: string) {
  if (model === "fixed") return "Фиксирана цена";
  if (model === "day_ahead") return "Борсова цена + добавка";
  if (model === "hybrid") return "Хибриден модел";
  return model || "—";
}

function convertBGNtoEUR(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return null;
  }

  return Number(value) / BGN_TO_EUR;
}

function formatBGN(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return `${Number(value).toLocaleString("bg-BG", {
    maximumFractionDigits: 2,
  })} лв.`;
}

function formatEUR(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return `${Number(value).toLocaleString("bg-BG", {
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

function formatMWh(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return `${Number(value).toLocaleString("bg-BG", {
    maximumFractionDigits: 2,
  })} MWh`;
}

function formatMonths(value?: number | null) {
  if (!value) return "—";
  return `${value} месеца`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString("bg-BG");
  } catch {
    return value;
  }
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div style={infoBoxStyle}>
      <span style={infoLabelStyle}>{label}</span>
      <strong>{value}</strong>
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

const heroCardStyle: React.CSSProperties = {
  background: "linear-gradient(135deg,#111827,#1d4ed8)",
  color: "white",
  padding: 32,
  borderRadius: 28,
  display: "flex",
  justifyContent: "space-between",
  gap: 24,
  alignItems: "center",
  boxShadow: "0 20px 60px rgba(15,23,42,0.25)",
};

const heroActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
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

const primaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 18px",
  borderRadius: 14,
  background: "white",
  color: "#1d4ed8",
  textDecoration: "none",
  fontWeight: 800,
};

const secondaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 18px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.5)",
  color: "white",
  textDecoration: "none",
  fontWeight: 800,
};

const primaryInlineButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  marginTop: 18,
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 18px",
  borderRadius: 14,
  background: "#2563eb",
  color: "white",
  textDecoration: "none",
  fontWeight: 800,
};

const warningStyle: React.CSSProperties = {
  background: "#fff7ed",
  border: "1px solid #fdba74",
  color: "#9a3412",
  padding: 16,
  borderRadius: 16,
  marginTop: 20,
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

const bidListStyle: React.CSSProperties = {
  display: "grid",
  gap: 18,
  marginTop: 20,
};

const bidCardStyle: React.CSSProperties = {
  padding: 22,
  borderRadius: 22,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const bestBidCardStyle: React.CSSProperties = {
  background: "#f0fdf4",
  border: "1px solid #86efac",
};

const bidHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  marginBottom: 14,
};

const bidNumberStyle: React.CSSProperties = {
  color: "#2563eb",
  fontWeight: 800,
};

const statusBadgeStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 999,
  background: "#dbeafe",
  color: "#1d4ed8",
  fontWeight: 800,
};

const notesStyle: React.CSSProperties = {
  marginTop: 18,
  padding: 16,
  borderRadius: 16,
  background: "white",
  border: "1px solid #e2e8f0",
};
