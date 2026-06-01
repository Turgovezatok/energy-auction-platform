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
  const [actionMessage, setActionMessage] = useState("");

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

  async function selectVariant(bid: any, variant: string) {
    setActionMessage("");

    const snapshot = buildVariantSnapshot(bid, variant);

    const { error: bidError } = await supabase
      .from("auction_bids")
      .update({
        selected_variant: variant,
        selected_at: new Date().toISOString(),
        selection_status: "selected_pending_confirmation",
        selection_snapshot: snapshot,
      })
      .eq("id", bid.id);

    if (bidError) {
      setActionMessage(`Грешка при избор на вариант: ${bidError.message}`);
      return;
    }

    const { error: auctionError } = await supabase
      .from("auctions")
      .update({
        selected_bid_id: bid.id,
        selected_variant: variant,
        selected_at: new Date().toISOString(),
        selection_status: "selected_pending_confirmation",
      })
      .eq("id", params.id);

    if (auctionError) {
      setActionMessage(`Грешка при обновяване на търга: ${auctionError.message}`);
      return;
    }

    setActionMessage(
      `Избран е ${variant} от оферта ${bid.bid_number || "без номер"}.`
    );

    await loadData();
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

  const bestVariant = findBestVariant(bids);

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

        {actionMessage && (
          <section style={successStyle}>
            <strong>{actionMessage}</strong>
          </section>
        )}

        <section style={gridStyle}>
          <Info label="Брой оферти" value={bids.length} />
          <Info
            label="Най-добър вариант"
            value={bestVariant ? bestVariant.label : "—"}
          />
          <Info
            label="Най-добра прогнозна стойност"
            value={bestVariant ? formatBGN(bestVariant.total) : "—"}
          />
          <Info label="Количество" value={formatMWh(auction.quantity_mwh)} />
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
                const isSelectedBid = auction.selected_bid_id === bid.id;

                return (
                  <article
                    key={bid.id}
                    style={{
                      ...bidCardStyle,
                      ...(isSelectedBid ? selectedBidCardStyle : {}),
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
                        {isSelectedBid
                          ? `Избрана: ${translateVariant(
                              auction.selected_variant
                            )}`
                          : bid.status || "submitted"}
                      </div>
                    </div>

                    <div style={gridStyle}>
                      <Info label="Дата на оферта" value={formatDate(bid.bid_date)} />
                      <Info label="Валидна до" value={formatDate(bid.valid_until)} />
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
                      <Info
                        label="Балансиране"
                        value={bid.includes_balancing ? "Включено" : "Не е включено"}
                      />
                    </div>

                    <div style={variantsGridStyle}>
                      {shouldShowFixedVariant(bid) && (
                        <VariantBox
                          title="Вариант 1: Фиксирана цена"
                          isBest={
                            bestVariant?.bidId === bid.id &&
                            bestVariant?.variant === "fixed"
                          }
                          isSelected={
                            isSelectedBid && auction.selected_variant === "fixed"
                          }
                        >
                          <div style={gridStyle}>
                            <Info
                              label="Цена"
                              value={formatBGNPerMWh(bid.fixed_price_bgn_mwh)}
                            />
                            <Info
                              label="Цена"
                              value={formatEURPerMWh(
                                convertBGNtoEUR(bid.fixed_price_bgn_mwh)
                              )}
                            />
                            <Info
                              label="Прогнозна обща стойност"
                              value={formatBGN(bid.estimated_total_bgn)}
                            />
                          </div>

                          <button
                            type="button"
                            style={selectButtonStyle}
                            onClick={() => selectVariant(bid, "fixed")}
                          >
                            Избери Вариант 1
                          </button>
                        </VariantBox>
                      )}

                      {shouldShowIndexedVariant(bid) && (
                        <VariantBox
                          title="Вариант 2: Борсова цена + добавка"
                          isBest={
                            bestVariant?.bidId === bid.id &&
                            bestVariant?.variant === "indexed"
                          }
                          isSelected={
                            isSelectedBid && auction.selected_variant === "indexed"
                          }
                        >
                          <div style={gridStyle}>
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
                              value={formatBGN(bid.indexed_estimated_total_bgn)}
                            />
                          </div>

                          <button
                            type="button"
                            style={selectButtonStyle}
                            onClick={() => selectVariant(bid, "indexed")}
                          >
                            Избери Вариант 2
                          </button>
                        </VariantBox>
                      )}

                      {shouldShowHybridVariant(bid) && (
                        <VariantBox
                          title="Вариант 3: Хибридна цена"
                          isBest={
                            bestVariant?.bidId === bid.id &&
                            bestVariant?.variant === "hybrid"
                          }
                          isSelected={
                            isSelectedBid && auction.selected_variant === "hybrid"
                          }
                        >
                          <div style={gridStyle}>
                            <Info
                              label="Фиксирана част"
                              value={formatBGNPerMWh(
                                bid.hybrid_fixed_price_bgn_mwh
                              )}
                            />
                            <Info
                              label="Фиксиран дял"
                              value={formatPercent(
                                bid.hybrid_fixed_share_percent
                              )}
                            />
                            <Info
                              label="Борсов дял"
                              value={formatPercent(
                                bid.hybrid_indexed_share_percent
                              )}
                            />
                            <Info
                              label="Борсова добавка"
                              value={formatBGNPerMWh(bid.day_ahead_adder_bgn_mwh)}
                            />
                            <Info
                              label="Прогнозна обща стойност"
                              value={formatBGN(bid.hybrid_estimated_total_bgn)}
                            />
                          </div>

                          <button
                            type="button"
                            style={selectButtonStyle}
                            onClick={() => selectVariant(bid, "hybrid")}
                          >
                            Избери Вариант 3
                          </button>
                        </VariantBox>
                      )}
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

function shouldShowFixedVariant(bid: any) {
  return bid.offer_fixed_enabled || Number(bid.fixed_price_bgn_mwh) > 0;
}

function shouldShowIndexedVariant(bid: any) {
  return (
    bid.offer_indexed_enabled ||
    Number(bid.day_ahead_adder_bgn_mwh) > 0 ||
    Number(bid.indexed_estimated_total_bgn) > 0
  );
}

function shouldShowHybridVariant(bid: any) {
  return (
    bid.offer_hybrid_enabled ||
    Number(bid.hybrid_fixed_price_bgn_mwh) > 0 ||
    Number(bid.hybrid_estimated_total_bgn) > 0
  );
}

function findBestVariant(bids: any[]) {
  const variants: any[] = [];

  for (const bid of bids) {
    if (shouldShowFixedVariant(bid) && Number(bid.estimated_total_bgn) > 0) {
      variants.push({
        bidId: bid.id,
        variant: "fixed",
        label: `${bid.supplier_name} • Вариант 1`,
        total: Number(bid.estimated_total_bgn),
      });
    }

    if (
      shouldShowIndexedVariant(bid) &&
      Number(bid.indexed_estimated_total_bgn) > 0
    ) {
      variants.push({
        bidId: bid.id,
        variant: "indexed",
        label: `${bid.supplier_name} • Вариант 2`,
        total: Number(bid.indexed_estimated_total_bgn),
      });
    }

    if (
      shouldShowHybridVariant(bid) &&
      Number(bid.hybrid_estimated_total_bgn) > 0
    ) {
      variants.push({
        bidId: bid.id,
        variant: "hybrid",
        label: `${bid.supplier_name} • Вариант 3`,
        total: Number(bid.hybrid_estimated_total_bgn),
      });
    }
  }

  if (variants.length === 0) return null;

  return variants.sort((a, b) => a.total - b.total)[0];
}

function buildVariantSnapshot(bid: any, variant: string) {
  if (variant === "fixed") {
    return {
      variant,
      bid_number: bid.bid_number,
      supplier_name: bid.supplier_name,
      fixed_price_bgn_mwh: bid.fixed_price_bgn_mwh,
      estimated_total_bgn: bid.estimated_total_bgn,
      selected_at: new Date().toISOString(),
    };
  }

  if (variant === "indexed") {
    return {
      variant,
      bid_number: bid.bid_number,
      supplier_name: bid.supplier_name,
      day_ahead_adder_bgn_mwh: bid.day_ahead_adder_bgn_mwh,
      balancing_adder_bgn_mwh: bid.balancing_adder_bgn_mwh,
      indexed_estimated_total_bgn: bid.indexed_estimated_total_bgn,
      selected_at: new Date().toISOString(),
    };
  }

  return {
    variant,
    bid_number: bid.bid_number,
    supplier_name: bid.supplier_name,
    hybrid_fixed_price_bgn_mwh: bid.hybrid_fixed_price_bgn_mwh,
    hybrid_fixed_share_percent: bid.hybrid_fixed_share_percent,
    hybrid_indexed_share_percent: bid.hybrid_indexed_share_percent,
    hybrid_estimated_total_bgn: bid.hybrid_estimated_total_bgn,
    selected_at: new Date().toISOString(),
  };
}

function translateVariant(variant?: string | null) {
  if (variant === "fixed") return "Вариант 1";
  if (variant === "indexed") return "Вариант 2";
  if (variant === "hybrid") return "Вариант 3";
  return "—";
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

function formatPercent(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return `${Number(value).toLocaleString("bg-BG", {
    maximumFractionDigits: 0,
  })}%`;
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

function VariantBox({
  title,
  children,
  isBest,
  isSelected,
}: {
  title: string;
  children: React.ReactNode;
  isBest?: boolean;
  isSelected?: boolean;
}) {
  return (
    <div
      style={{
        ...variantBoxStyle,
        ...(isBest ? bestVariantStyle : {}),
        ...(isSelected ? selectedVariantStyle : {}),
      }}
    >
      <div style={variantHeaderStyle}>
        <h3 style={{ margin: 0 }}>{title}</h3>

        {isSelected ? (
          <span style={selectedBadgeStyle}>Избран</span>
        ) : isBest ? (
          <span style={bestBadgeStyle}>Най-добър</span>
        ) : null}
      </div>

      {children}
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

const successStyle: React.CSSProperties = {
  background: "#ecfdf5",
  border: "1px solid #86efac",
  color: "#065f46",
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

const selectedBidCardStyle: React.CSSProperties = {
  background: "#ecfdf5",
  border: "1px solid #22c55e",
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

const variantsGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 18,
  marginTop: 22,
};

const variantBoxStyle: React.CSSProperties = {
  padding: 20,
  borderRadius: 20,
  background: "white",
  border: "1px solid #e2e8f0",
};

const bestVariantStyle: React.CSSProperties = {
  border: "1px solid #86efac",
  background: "#f0fdf4",
};

const selectedVariantStyle: React.CSSProperties = {
  border: "2px solid #16a34a",
  background: "#dcfce7",
};

const variantHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  marginBottom: 16,
};

const bestBadgeStyle: React.CSSProperties = {
  padding: "7px 10px",
  borderRadius: 999,
  background: "#dcfce7",
  color: "#166534",
  fontWeight: 800,
  fontSize: 13,
};

const selectedBadgeStyle: React.CSSProperties = {
  padding: "7px 10px",
  borderRadius: 999,
  background: "#16a34a",
  color: "white",
  fontWeight: 800,
  fontSize: 13,
};

const selectButtonStyle: React.CSSProperties = {
  marginTop: 16,
  padding: "12px 16px",
  borderRadius: 14,
  border: 0,
  background: "#2563eb",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};

const notesStyle: React.CSSProperties = {
  marginTop: 18,
  padding: 16,
  borderRadius: 16,
  background: "white",
  border: "1px solid #e2e8f0",
};
