"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    loadInvoices();
  }, []);

  async function loadInvoices() {
    const { data } = await supabase
      .from("invoice_uploads")
      .select("*")
      .order("created_at", { ascending: false });

    setInvoices(data || []);
  }

  return (
    <main style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Фактури</h1>
          <p style={subtitleStyle}>
            Качени фактури, извлечени данни и подготовка за търг
          </p>
        </div>

        <div style={counterStyle}>
          📄 {invoices.length} фактури
        </div>
      </div>

      <section style={gridStyle}>
        {invoices.map((invoice) => (
          <article key={invoice.id} style={cardStyle}>
            <div style={topRowStyle}>
              <div>
                <div style={badgeStyle}>AI обработена</div>

                <h2 style={companyStyle}>
                  {invoice.customer_name || "Неизвестен клиент"}
                </h2>

                <p style={supplierStyle}>
                  Доставчик: {invoice.supplier_name || "-"}
                </p>
              </div>

              <div style={iconBoxStyle}>⚡</div>
            </div>

            <div style={infoGridStyle}>
              <Info label="Фактура" value={invoice.invoice_number || "-"} />
              <Info label="ЕИК" value={invoice.customer_eik || "-"} />
              <Info
                label="Потребление"
                value={`${invoice.total_consumption_mwh || "-"} MWh`}
              />
              <Info
                label="Цена"
                value={
                  invoice.energy_price_eur_mwh
                    ? `${Number(invoice.energy_price_eur_mwh).toFixed(2)} €/MWh`
                    : "-"
                }
              />
            </div>

            <div style={footerStyle}>
              <a
                href={invoice.file_url}
                target="_blank"
                style={secondaryButtonStyle}
              >
                Преглед PDF
              </a>

              <a
  href={`/create-auction?invoiceId=${invoice.id}`}
  style={primaryButtonStyle}
>
  Създай търг
</a>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoStyle}>
      <span style={infoLabelStyle}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f3f6fb",
  padding: 40,
  fontFamily: "Arial",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 32,
};

const titleStyle: React.CSSProperties = {
  fontSize: 46,
  fontWeight: 800,
  margin: 0,
};

const subtitleStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 18,
};

const counterStyle: React.CSSProperties = {
  background: "white",
  padding: "14px 20px",
  borderRadius: 18,
  boxShadow: "0 8px 30px rgba(15,23,42,0.08)",
  fontWeight: 700,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))",
  gap: 24,
};

const cardStyle: React.CSSProperties = {
  background: "white",
  padding: 26,
  borderRadius: 26,
  boxShadow: "0 12px 40px rgba(15,23,42,0.08)",
  border: "1px solid #e2e8f0",
};

const topRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
};

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  padding: "8px 12px",
  borderRadius: 999,
  background: "#dcfce7",
  color: "#166534",
  fontWeight: 700,
  fontSize: 13,
  marginBottom: 12,
};

const companyStyle: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 800,
  margin: "0 0 8px",
};

const supplierStyle: React.CSSProperties = {
  color: "#64748b",
  margin: 0,
};

const iconBoxStyle: React.CSSProperties = {
  width: 54,
  height: 54,
  borderRadius: 18,
  background: "#eff6ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 26,
};

const infoGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 14,
  marginTop: 24,
};

const infoStyle: React.CSSProperties = {
  background: "#f8fafc",
  borderRadius: 16,
  padding: 14,
};

const infoLabelStyle: React.CSSProperties = {
  display: "block",
  color: "#64748b",
  fontSize: 13,
  marginBottom: 6,
};

const footerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  marginTop: 24,
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 14,
  border: "1px solid #cbd5e1",
  color: "#0f172a",
  textDecoration: "none",
  fontWeight: 700,
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "12px 18px",
  borderRadius: 14,
  border: 0,
  background: "#2563eb",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};
