"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ProducerOnboardingPage() {
  const [companyEik, setCompanyEik] = useState("");
  const [producers, setProducers] = useState<any[]>([]);
  const [selectedProducer, setSelectedProducer] = useState<any>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function searchProducer() {
    setLoading(true);
    setMessage("");
    setProducers([]);
    setSelectedProducer(null);
    setSearched(false);

    const cleanEik = companyEik.trim();

    if (!cleanEik) {
      setMessage("Въведи ЕИК.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("producers")
      .select("*")
      .eq("company_eik", cleanEik)
      .order("installed_capacity_kw", { ascending: false });

    setLoading(false);
    setSearched(true);

    if (error) {
      setMessage(`Грешка при търсене: ${error.message}`);
      return;
    }

    if (!data || data.length === 0) {
      setMessage(
        "Не е намерен производител с този ЕИК. Може да продължиш с ръчно въвеждане."
      );
      return;
    }

    setProducers(data);
    setSelectedProducer(data[0]);
    setMessage(`Намерени са ${data.length} обекта за този ЕИК.`);
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <section style={heroStyle}>
          <div>
            <div style={badgeStyle}>Producer onboarding</div>
            <h1 style={{ margin: "10px 0" }}>Регистрация на производител</h1>
            <p style={mutedWhiteStyle}>
              Въведи ЕИК, за да проверим дали производителят вече съществува в
              базата.
            </p>
          </div>
        </section>

        <section style={cardStyle}>
          <h2>Търсене по ЕИК</h2>

          <div style={searchRowStyle}>
            <input
              value={companyEik}
              onChange={(event) => setCompanyEik(event.target.value)}
              placeholder="Например: 123456789"
              style={inputStyle}
            />

            <button onClick={searchProducer} disabled={loading} style={buttonStyle}>
              {loading ? "Търсене..." : "Търси"}
            </button>
          </div>

          {message && <div style={messageStyle}>{message}</div>}
        </section>

        {selectedProducer && (
          <section style={cardStyle}>
            <h2>Намерени данни</h2>

            <div style={gridStyle}>
              <Info label="ЕИК" value={selectedProducer.company_eik || "—"} />
              <Info label="Фирма" value={selectedProducer.company_name || "—"} />
              <Info
                label="Избран обект"
                value={selectedProducer.plant_name || "—"}
              />
              <Info
                label="Технология"
                value={
                  selectedProducer.technology ||
                  selectedProducer.plant_type ||
                  "—"
                }
              />
              <Info
                label="Инсталирана мощност"
                value={
                  selectedProducer.installed_capacity_kw
                    ? `${selectedProducer.installed_capacity_kw} kW`
                    : "—"
                }
              />
              <Info label="Локация" value={selectedProducer.location || "—"} />
              <Info
                label="Вид енергия"
                value={selectedProducer.energy_type || "—"}
              />
              <Info
                label="Мрежови оператор"
                value={selectedProducer.grid_operator || "—"}
              />
              <Info label="EIC код" value={selectedProducer.eic_code || "—"} />
            </div>

            {producers.length > 1 && (
              <div style={plantsListStyle}>
                <h3>Обекти към този производител</h3>

                {producers.map((item) => {
                  const selected = selectedProducer?.id === item.id;

                  return (
                    <button
                      key={item.id || `${item.company_eik}-${item.plant_name}`}
                      type="button"
                      onClick={() => setSelectedProducer(item)}
                      style={{
                        ...plantButtonStyle,
                        ...(selected ? selectedPlantButtonStyle : {}),
                      }}
                    >
                      <div>
                        <strong>{item.plant_name || "Обект без име"}</strong>
                        <span style={plantMetaStyle}>
                          {item.technology || "—"} •{" "}
                          {item.installed_capacity_kw || "—"} kW
                        </span>
                      </div>

                      {selected && <span style={selectedBadgeStyle}>Избран</span>}
                    </button>
                  );
                })}
              </div>
            )}

            <button style={primaryButtonStyle}>
              Продължи с този производител
            </button>
          </section>
        )}

        {searched && !selectedProducer && (
          <section style={cardStyle}>
            <h2>Ръчно въвеждане</h2>

            <div style={gridStyle}>
              <Field label="ЕИК" value={companyEik} />
              <Field label="Име на фирма" />
              <Field label="Име на централа" />
              <Field label="Тип централа" />
              <Field label="Инсталирана мощност kW" />
              <Field label="Локация" />
              <Field label="Мрежови оператор" />
              <Field label="EIC код" />
            </div>

            <button style={primaryButtonStyle}>
              Продължи с ръчно въведени данни
            </button>
          </section>
        )}
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div style={infoStyle}>
      <span style={labelStyle}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Field({ label, value = "" }: { label: string; value?: string }) {
  return (
    <div style={fieldStyle}>
      <label style={fieldLabelStyle}>{label}</label>
      <input defaultValue={value} style={inputStyle} />
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
  maxWidth: 1100,
  margin: "0 auto",
};

const heroStyle: React.CSSProperties = {
  background: "linear-gradient(135deg,#064e3b,#0f766e)",
  color: "white",
  padding: 34,
  borderRadius: 28,
  boxShadow: "0 20px 60px rgba(15,23,42,0.2)",
};

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  padding: "8px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.18)",
  fontWeight: 800,
};

const mutedWhiteStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.78)",
  lineHeight: 1.6,
};

const cardStyle: React.CSSProperties = {
  background: "white",
  padding: 28,
  borderRadius: 24,
  boxShadow: "0 14px 40px rgba(15,23,42,0.08)",
  marginTop: 26,
};

const searchRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  marginTop: 16,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 14,
  border: "1px solid #cbd5e1",
  fontSize: 15,
};

const buttonStyle: React.CSSProperties = {
  padding: "13px 20px",
  borderRadius: 14,
  border: 0,
  background: "#2563eb",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};

const primaryButtonStyle: React.CSSProperties = {
  marginTop: 22,
  padding: "14px 22px",
  borderRadius: 16,
  border: 0,
  background: "#059669",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};

const messageStyle: React.CSSProperties = {
  marginTop: 18,
  padding: 14,
  borderRadius: 14,
  background: "#eff6ff",
  color: "#1e40af",
  fontWeight: 700,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
  marginTop: 18,
};

const infoStyle: React.CSSProperties = {
  padding: 16,
  borderRadius: 16,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "#64748b",
  fontSize: 13,
  marginBottom: 6,
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const fieldLabelStyle: React.CSSProperties = {
  color: "#334155",
  fontWeight: 700,
};

const plantsListStyle: React.CSSProperties = {
  marginTop: 24,
  display: "grid",
  gap: 12,
};

const plantButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: 16,
  borderRadius: 16,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  textAlign: "left",
  cursor: "pointer",
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "center",
};

const selectedPlantButtonStyle: React.CSSProperties = {
  border: "1px solid #16a34a",
  background: "#ecfdf5",
};

const plantMetaStyle: React.CSSProperties = {
  display: "block",
  color: "#64748b",
  marginTop: 6,
};

const selectedBadgeStyle: React.CSSProperties = {
  padding: "7px 10px",
  borderRadius: 999,
  background: "#16a34a",
  color: "white",
  fontWeight: 800,
  fontSize: 13,
};
