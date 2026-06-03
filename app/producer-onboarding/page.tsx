"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ProducerOnboardingPage() {
  const [companyEik, setCompanyEik] = useState("");
  const [records, setRecords] = useState<any[]>([]);
  const [selectedPlantKey, setSelectedPlantKey] = useState("");
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [contact, setContact] = useState({
    contact_person: "",
    contact_email: "",
    contact_phone: "",
  });

  async function searchProducer() {
    setLoading(true);
    setMessage("");
    setRecords([]);
    setSelectedPlantKey("");
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
      .order("plant_name", { ascending: true })
      .order("period_from", { ascending: true });

    setLoading(false);
    setSearched(true);

    if (error) {
      setMessage(`Грешка при търсене: ${error.message}`);
      return;
    }

    if (!data || data.length === 0) {
      setMessage("Не е намерен производител с този ЕИК.");
      return;
    }

    setRecords(data);

    const firstKey = makePlantKey(data[0]);
    setSelectedPlantKey(firstKey);

    setMessage(`Намерени са ${data.length} записа в базата.`);
  }

  const groupedPlants = groupByPlant(records);
  const selectedPlant = groupedPlants.find((plant) => plant.key === selectedPlantKey);

  async function saveContact() {
    if (!selectedPlant) return;

    if (!contact.contact_email || !contact.contact_phone) {
      setMessage("Имейл и мобилен телефон са задължителни.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("producers")
      .update({
        contact_person: contact.contact_person || null,
        contact_email: contact.contact_email,
        contact_phone: contact.contact_phone,
      })
      .eq("company_eik", selectedPlant.company_eik)
      .eq("plant_name", selectedPlant.plant_name);

    setSaving(false);

    if (error) {
      setMessage(`Грешка при запис: ${error.message}`);
      return;
    }

    setMessage("Контактните данни са записани успешно.");
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <section style={heroStyle}>
          <div style={badgeStyle}>Producer onboarding</div>
          <h1 style={{ margin: "10px 0" }}>Регистрация на производител</h1>
          <p style={mutedWhiteStyle}>
            Въведи ЕИК, за да намерим всички централи и месечни производства от базата.
          </p>
        </section>

        <section style={cardStyle}>
          <h2>Търсене по ЕИК</h2>

          <div style={searchRowStyle}>
            <input
              value={companyEik}
              onChange={(event) => setCompanyEik(event.target.value)}
              placeholder="Например: 201166767"
              style={inputStyle}
            />

            <button onClick={searchProducer} disabled={loading} style={buttonStyle}>
              {loading ? "Търсене..." : "Търси"}
            </button>
          </div>

          {message && <div style={messageStyle}>{message}</div>}
        </section>

        {selectedPlant && (
          <>
            <section style={cardStyle}>
              <h2>Данни за производителя</h2>

              <div style={gridStyle}>
                <Info label="ЕИК" value={selectedPlant.company_eik} />
                <Info label="Производител" value={selectedPlant.company_name} />
                <Info label="Избран обект" value={selectedPlant.plant_name} />
                <Info label="Адрес" value={selectedPlant.location} />
                <Info label="Инсталирана мощност" value={`${selectedPlant.installed_capacity_kw || "—"} kW`} />
                <Info label="Технология" value={selectedPlant.technology || "—"} />
                <Info label="Вид енергия" value={selectedPlant.energy_type || "—"} />
                <Info label="Дата на въвеждане" value={selectedPlant.commissioning_date || "—"} />
                <Info label="Схеми за подпомагане" value={selectedPlant.support_scheme || "—"} />
                <Info label="Общо произведена енергия" value={`${formatNumber(selectedPlant.total_production_mwh)} MWh`} />
              </div>
            </section>

            {groupedPlants.length > 1 && (
              <section style={cardStyle}>
                <h2>Обекти към този производител</h2>

                <div style={plantsListStyle}>
                  {groupedPlants.map((plant) => {
                    const selected = plant.key === selectedPlantKey;

                    return (
                      <button
                        key={plant.key}
                        type="button"
                        onClick={() => setSelectedPlantKey(plant.key)}
                        style={{
                          ...plantButtonStyle,
                          ...(selected ? selectedPlantButtonStyle : {}),
                        }}
                      >
                        <div>
                          <strong>{plant.plant_name || "Обект без име"}</strong>
                          <span style={plantMetaStyle}>
                            {plant.technology || "—"} • {plant.installed_capacity_kw || "—"} MW •{" "}
                            {formatNumber(plant.total_production_mwh)} MWh
                          </span>
                        </div>

                        {selected && <span style={selectedBadgeStyle}>Избран</span>}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <section style={cardStyle}>
              <h2>Месечно производство</h2>

              <div style={tableWrapperStyle}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Период от</th>
                      <th style={thStyle}>Период до</th>
                      <th style={thStyle}>Произведена енергия</th>
                      <th style={thStyle}>Схема</th>
                    </tr>
                  </thead>

                  <tbody>
                    {selectedPlant.records.map((row: any) => (
                      <tr key={row.id || `${row.period_from}-${row.period_to}`}>
                        <td style={tdStyle}>{row.period_from || "—"}</td>
                        <td style={tdStyle}>{row.period_to || "—"}</td>
                        <td style={tdStyle}>{formatNumber(row.production_mwh)} MWh</td>
                        <td style={tdStyle}>{row.support_scheme || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section style={cardStyle}>
              <h2>Контактни данни</h2>

              <div style={gridStyle}>
                <Field
                  label="Лице за контакт"
                  value={contact.contact_person}
                  onChange={(value) =>
                    setContact((current) => ({ ...current, contact_person: value }))
                  }
                />

                <Field
                  label="Имейл"
                  type="email"
                  required
                  value={contact.contact_email}
                  onChange={(value) =>
                    setContact((current) => ({ ...current, contact_email: value }))
                  }
                />

                <Field
                  label="Мобилен телефон"
                  type="tel"
                  required
                  value={contact.contact_phone}
                  onChange={(value) =>
                    setContact((current) => ({ ...current, contact_phone: value }))
                  }
                />
              </div>

              <button onClick={saveContact} disabled={saving} style={primaryButtonStyle}>
                {saving ? "Записване..." : "Продължи с този производител"}
              </button>
            </section>
          </>
        )}

        {searched && records.length === 0 && (
          <section style={cardStyle}>
            <h2>Ръчно въвеждане</h2>

            <div style={gridStyle}>
              <Field label="ЕИК" value={companyEik} onChange={setCompanyEik} />
              <Field label="Име на фирма" />
              <Field label="Име на централа" />
              <Field label="Тип централа" />
              <Field label="Инсталирана мощност MW" />
              <Field label="Локация" />
              <Field label="Имейл" type="email" />
              <Field label="Мобилен телефон" type="tel" />
            </div>

            <button style={primaryButtonStyle}>Продължи с ръчно въведени данни</button>
          </section>
        )}
      </div>
    </main>
  );
}

function makePlantKey(row: any) {
  return `${row.company_eik || ""}__${row.plant_name || ""}__${row.location || ""}`;
}

function groupByPlant(records: any[]) {
  const map = new Map<string, any>();

  for (const row of records) {
    const key = makePlantKey(row);

    if (!map.has(key)) {
      map.set(key, {
        key,
        company_eik: row.company_eik,
        company_name: row.company_name,
        plant_name: row.plant_name,
        location: row.location,
        installed_capacity_Mw: row.installed_capacity_Mw,
        technology: row.technology,
        energy_type: row.energy_type,
        commissioning_date: row.commissioning_date,
        support_scheme: row.support_scheme,
        total_production_mwh: 0,
        records: [],
      });
    }

    const plant = map.get(key);
    plant.records.push(row);
    plant.total_production_mwh += Number(row.production_mwh || 0);
  }

  return Array.from(map.values());
}

function formatNumber(value: any) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";

  return number.toLocaleString("bg-BG", {
    maximumFractionDigits: 3,
  });
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div style={infoStyle}>
      <span style={labelStyle}>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function Field({
  label,
  value = "",
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div style={fieldStyle}>
      <label style={fieldLabelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange?.(event.target.value)}
        style={inputStyle}
      />
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
  maxWidth: 1150,
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
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
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
  display: "grid",
  gap: 12,
  marginTop: 18,
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

const tableWrapperStyle: React.CSSProperties = {
  overflowX: "auto",
  marginTop: 18,
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: 12,
  background: "#f1f5f9",
  borderBottom: "1px solid #e2e8f0",
};

const tdStyle: React.CSSProperties = {
  padding: 12,
  borderBottom: "1px solid #e2e8f0",
};
