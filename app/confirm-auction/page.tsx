"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ConfirmAuctionPage() {
  const [invoice, setInvoice] = useState<any>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [months, setMonths] = useState(12);
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryStartDate, setDeliveryStartDate] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    async function loadData() {
      const params = new URLSearchParams(window.location.search);
      const invoiceId = params.get("invoiceId");
      const emailParam = params.get("email");

      if (emailParam) setEmail(emailParam);

      if (!invoiceId) {
        alert("Липсва invoiceId");
        return;
      }

      const { data: invoiceData } = await supabase
        .from("invoice_uploads")
        .select("*")
        .eq("id", invoiceId)
        .single();

      const { data: siteData } = await supabase
        .from("invoice_sites")
        .select("*")
        .eq("invoice_id", invoiceId);

      setInvoice(invoiceData);
      setSites(siteData || []);
    }

    loadData();
  }, []);

  if (!invoice) {
    return (
      <main style={pageStyle}>
        <h1>Зареждане...</h1>
      </main>
    );
  }

  const monthlyMwh =
    invoice.total_consumption_mwh ||
    sites.reduce((sum, site) => sum + Number(site.consumption_mwh || 0), 0);

  const monthlyKwh = monthlyMwh * 1000;
  const estimatedContractKwh = monthlyKwh * months;

  function createAuction() {
    if (!contactName || !phone || !deliveryStartDate) {
      alert("Попълнете лице за контакт, телефон и начална дата.");
      return;
    }

    alert(
      "Търгът е готов за създаване ✅\n\n" +
        `Фирма: ${invoice.customer_name}\n` +
        `ЕИК: ${invoice.customer_eik}\n` +
        `Период: ${months} месеца\n` +
        `Очаквано количество: ${estimatedContractKwh.toFixed(0)} kWh`
    );
  }

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <h1>Потвърждение на търг</h1>

        <p style={mutedStyle}>
          Проверете извлечените данни, допълнете контакт и изберете период.
        </p>

        <section style={sectionStyle}>
          <h2>Извлечени данни</h2>

          <div style={gridStyle}>
            <Info label="Фирма" value={invoice.customer_name} />
            <Info label="ЕИК" value={invoice.customer_eik} />
            <Info label="Доставчик" value={invoice.supplier_name} />
            <Info label="Фактура №" value={invoice.invoice_number} />
            <Info label="Период" value={invoice.reporting_period} />
            <Info
              label="Месечно потребление"
              value={`${monthlyKwh.toFixed(0)} kWh`}
            />
          </div>
        </section>

        <section style={sectionStyle}>
          <h2>Обекти / ИТН</h2>

          {sites.map((site) => (
            <div key={site.id} style={siteStyle}>
              <strong>ИТН: {site.itn}</strong>
              <div>{site.address}</div>
              <div>
                Консумация: {Number(site.consumption_mwh || 0).toFixed(3)} MWh
              </div>
            </div>
          ))}
        </section>

        <section style={sectionStyle}>
          <h2>Допълнете информация</h2>

          <input
            placeholder="Лице за контакт"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Телефон"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Имейл"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />

          <label style={labelStyle}>Начална дата на доставка</label>

          <input
            type="date"
            value={deliveryStartDate}
            onChange={(e) => setDeliveryStartDate(e.target.value)}
            style={inputStyle}
          />
        </section>

        <section style={sectionStyle}>
          <h2>Период на търга</h2>

          <div style={buttonGridStyle}>
            {[3, 6, 12, 24, 36].map((m) => (
              <button
                key={m}
                onClick={() => setMonths(m)}
                style={{
                  ...periodButtonStyle,
                  background: months === m ? "#059669" : "white",
                  color: months === m ? "white" : "#0f172a",
                }}
              >
                {m} месеца
              </button>
            ))}
          </div>

          <div style={summaryStyle}>
            <div>Месечно количество: {monthlyKwh.toFixed(0)} kWh</div>
            <div>Период: {months} месеца</div>
            <strong>
              Очаквано количество за търга:{" "}
              {estimatedContractKwh.toFixed(0)} kWh
            </strong>
          </div>
        </section>

        <button onClick={createAuction} style={submitButtonStyle}>
          Създай търг
        </button>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div style={infoBoxStyle}>
      <div style={{ color: "#64748b", fontSize: 14 }}>{label}</div>
      <strong>{value || "—"}</strong>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f8fafc",
  padding: 40,
  fontFamily: "Arial",
};

const cardStyle: React.CSSProperties = {
  maxWidth: 1050,
  margin: "0 auto",
  background: "white",
  padding: 36,
  borderRadius: 24,
  boxShadow: "0 14px 40px rgba(15,23,42,0.08)",
};

const mutedStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 17,
};

const sectionStyle: React.CSSProperties = {
  marginTop: 34,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
};

const infoBoxStyle: React.CSSProperties = {
  padding: 16,
  borderRadius: 16,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const siteStyle: React.CSSProperties = {
  padding: 16,
  borderRadius: 16,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  marginBottom: 12,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 14,
  marginTop: 14,
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  fontSize: 16,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginTop: 18,
  fontWeight: 700,
};

const buttonGridStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const periodButtonStyle: React.CSSProperties = {
  padding: "12px 18px",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  cursor: "pointer",
  fontWeight: 700,
};

const summaryStyle: React.CSSProperties = {
  marginTop: 22,
  padding: 20,
  borderRadius: 18,
  background: "#ecfdf5",
  border: "1px solid #a7f3d0",
  fontSize: 18,
  lineHeight: 1.8,
};

const submitButtonStyle: React.CSSProperties = {
  marginTop: 34,
  padding: "16px 26px",
  borderRadius: 14,
  border: 0,
  background: "#059669",
  color: "white",
  fontWeight: 800,
  fontSize: 17,
  cursor: "pointer",
};
