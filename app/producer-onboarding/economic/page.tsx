"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

function ProducerEconomicContent() {
  const searchParams = useSearchParams();

  const companyEik = searchParams.get("eik") || "";
  const plantName = searchParams.get("plant") || "";
  const location = searchParams.get("location") || "";

  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    current_buyer: "",
    contract_type: "",
    contract_end_date: "",
    sale_price_bgn_mwh: "",
    balancing_cost_bgn_mwh: "",
    green_certificate_included: false,
    notes: "",
  });

  const [files, setFiles] = useState({
    invoice1: null as File | null,
    invoice2: null as File | null,
    invoice3: null as File | null,
  });

  function updateField(name: string, value: any) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function uploadInvoice(file: File | null, index: number) {
    if (!file) return null;

    const path = `${companyEik || "unknown"}/${Date.now()}-invoice-${index}-${file.name}`;

    const { error } = await supabase.storage
      .from("producer-invoices")
      .upload(path, file, { upsert: true });

    if (error) throw new Error(error.message);

    return path;
  }

  async function processInvoice() {
  if (!files.invoice1) {
    setMessage("Моля, първо качете фактура, издадена към търговеца.");
    return;
  }

  setProcessing(true);
  setMessage("");

  try {
    const invoicePath = await uploadInvoice(files.invoice1, 1);

    setMessage(`Фактурата е качена успешно. Път: ${invoicePath}`);
  } catch (error) {
    setMessage(
      error instanceof Error
        ? error.message
        : "Грешка при качване на фактура."
    );
  } finally {
    setProcessing(false);
  }
}

  setProcessing(true);
  setMessage("");

  try {
    const invoicePath = await uploadInvoice(files.invoice1, 1);

    setMessage(
      `Фактурата е качена успешно. Път: ${invoicePath}`
    );
  } catch (error) {
    setMessage(
      error instanceof Error
        ? error.message
        : "Грешка при качване на фактура."
    );
  } finally {
    setProcessing(false);
  }
}

    setProcessing(true);
    setMessage("");

    try {
      setMessage("Фактурата е готова за обработка. Следваща стъпка: свързване с AI extractor.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Грешка при обработка на фактура.");
    } finally {
      setProcessing(false);
    }
  }

  async function saveEconomicData(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    if (!files.invoice1) {
      setMessage("Фактура 1 е задължителна.");
      setSaving(false);
      return;
    }

    try {
      const invoice1Url = await uploadInvoice(files.invoice1, 1);
      const invoice2Url = await uploadInvoice(files.invoice2, 2);
      const invoice3Url = await uploadInvoice(files.invoice3, 3);

      const { error } = await supabase.from("producer_economic_data").insert({
        company_eik: companyEik,
        plant_name: plantName,
        location,
        current_buyer: form.current_buyer || null,
        contract_type: form.contract_type || null,
        contract_end_date: form.contract_end_date || null,
        sale_price_bgn_mwh: toNullableNumber(form.sale_price_bgn_mwh),
        balancing_cost_bgn_mwh: toNullableNumber(form.balancing_cost_bgn_mwh),
        green_certificate_included: form.green_certificate_included,
        notes: form.notes || null,
        invoice_1_url: invoice1Url,
        invoice_2_url: invoice2Url,
        invoice_3_url: invoice3Url,
      });

      if (error) {
        setMessage(`Грешка при запис: ${error.message}`);
        return;
      }

      setMessage("Икономическите данни са записани успешно.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Грешка при качване на файл.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <section style={heroStyle}>
          <div style={badgeStyle}>Producer economic onboarding</div>
          <h1 style={{ margin: "10px 0" }}>Икономически данни на производител</h1>
          <p style={mutedWhiteStyle}>
            Тук събираме фактура към търговеца, текущ договор, край на договора и основни икономически параметри.
          </p>
        </section>

        <section style={cardStyle}>
          <h2>Избран обект</h2>
          <div style={gridStyle}>
            <Info label="ЕИК" value={companyEik} />
            <Info label="Обект" value={plantName} />
            <Info label="Локация" value={location} />
          </div>
        </section>

        <form onSubmit={saveEconomicData}>
          <section style={cardStyle}>
            <h2>Фактури към търговеца</h2>
            <p style={mutedStyle}>
              Моля, качете фактура, която вашето дружество е издало към настоящия търговец/купувач на електроенергия.
              От нея ще извлечем търговеца, произведената енергия, цена, период и стойност.
            </p>

            <div style={gridStyle}>
              <FileField
                label="Фактура 1 — задължителна"
                required
                onChange={(file) => setFiles((current) => ({ ...current, invoice1: file }))}
              />
              <FileField
                label="Фактура 2 — по желание"
                onChange={(file) => setFiles((current) => ({ ...current, invoice2: file }))}
              />
              <FileField
                label="Фактура 3 — по желание"
                onChange={(file) => setFiles((current) => ({ ...current, invoice3: file }))}
              />
            </div>

            <button
              type="button"
              onClick={processInvoice}
              disabled={!files.invoice1 || processing}
              style={secondaryButtonStyle}
            >
              {processing ? "Обработка..." : "Обработи фактура"}
            </button>
          </section>

          <section style={cardStyle}>
            <h2>Икономически параметри</h2>

            <div style={gridStyle}>
              <Field
                label="Настоящ купувач / търговец"
                value={form.current_buyer}
                onChange={(v) => updateField("current_buyer", v)}
              />

              <SelectField
                label="Вид договор"
                value={form.contract_type}
                onChange={(v) => updateField("contract_type", v)}
                options={[
                  { value: "", label: "Изберете" },
                  { value: "open", label: "Отворен" },
                  { value: "closed", label: "Затворен" },
                ]}
              />

              <Field
                label="Край на договор"
                type="date"
                value={form.contract_end_date}
                onChange={(v) => updateField("contract_end_date", v)}
              />

              <Field
                label="Продажна цена BGN/MWh"
                type="number"
                value={form.sale_price_bgn_mwh}
                onChange={(v) => updateField("sale_price_bgn_mwh", v)}
              />

              <Field
                label="Разход за балансиране BGN/MWh"
                type="number"
                value={form.balancing_cost_bgn_mwh}
                onChange={(v) => updateField("balancing_cost_bgn_mwh", v)}
              />
            </div>

            <label style={checkboxStyle}>
              <input
                type="checkbox"
                checked={form.green_certificate_included}
                onChange={(event) => updateField("green_certificate_included", event.target.checked)}
              />
              <span>Включени гаранции за произход / зелени сертификати</span>
            </label>

            <div style={{ marginTop: 18 }}>
              <label style={fieldLabelStyle}>Бележки</label>
              <textarea
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                style={textareaStyle}
              />
            </div>

            {message && <div style={messageStyle}>{message}</div>}

            <button type="submit" disabled={saving} style={primaryButtonStyle}>
              {saving ? "Записване..." : "Запази икономическите данни"}
            </button>
          </section>
        </form>
      </div>
    </main>
  );
}

export default function ProducerEconomicPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Зареждане...</div>}>
      <ProducerEconomicContent />
    </Suspense>
  );
}

function toNullableNumber(value: string) {
  if (!value) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div style={infoStyle}>
      <span style={labelStyle}>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div style={fieldStyle}>
      <label style={fieldLabelStyle}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div style={fieldStyle}>
      <label style={fieldLabelStyle}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function FileField({ label, required = false, onChange }: {
  label: string;
  required?: boolean;
  onChange: (file: File | null) => void;
}) {
  return (
    <div style={fieldStyle}>
      <label style={fieldLabelStyle}>{label}</label>
      <input
        type="file"
        required={required}
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
        style={inputStyle}
      />
    </div>
  );
}

const pageStyle: React.CSSProperties = { minHeight: "100vh", background: "#f3f6fb", padding: 40, fontFamily: "Arial, sans-serif" };
const containerStyle: React.CSSProperties = { maxWidth: 1150, margin: "0 auto" };
const heroStyle: React.CSSProperties = { background: "linear-gradient(135deg,#1e3a8a,#0f766e)", color: "white", padding: 34, borderRadius: 28 };
const badgeStyle: React.CSSProperties = { display: "inline-flex", padding: "8px 12px", borderRadius: 999, background: "rgba(255,255,255,0.18)", fontWeight: 800 };
const mutedWhiteStyle: React.CSSProperties = { color: "rgba(255,255,255,0.8)" };
const mutedStyle: React.CSSProperties = { color: "#64748b", lineHeight: 1.6 };
const cardStyle: React.CSSProperties = { background: "white", padding: 28, borderRadius: 24, marginTop: 26, boxShadow: "0 14px 40px rgba(15,23,42,0.08)" };
const gridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 16, marginTop: 18 };
const infoStyle: React.CSSProperties = { padding: 16, borderRadius: 16, background: "#f8fafc", border: "1px solid #e2e8f0" };
const labelStyle: React.CSSProperties = { display: "block", color: "#64748b", fontSize: 13, marginBottom: 6 };
const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 8 };
const fieldLabelStyle: React.CSSProperties = { color: "#334155", fontWeight: 700 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "13px 14px", borderRadius: 14, border: "1px solid #cbd5e1", fontSize: 15 };
const textareaStyle: React.CSSProperties = { width: "100%", minHeight: 100, padding: "13px 14px", borderRadius: 14, border: "1px solid #cbd5e1", fontSize: 15, marginTop: 8 };
const checkboxStyle: React.CSSProperties = { display: "flex", gap: 10, alignItems: "center", padding: 14, borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0", marginTop: 18 };
const messageStyle: React.CSSProperties = { marginTop: 18, padding: 14, borderRadius: 14, background: "#eff6ff", color: "#1e40af", fontWeight: 700 };
const primaryButtonStyle: React.CSSProperties = { marginTop: 22, padding: "14px 22px", borderRadius: 16, border: 0, background: "#059669", color: "white", fontWeight: 800, cursor: "pointer" };
const secondaryButtonStyle: React.CSSProperties = { marginTop: 18, padding: "13px 18px", borderRadius: 14, border: "1px solid #2563eb", background: "white", color: "#2563eb", fontWeight: 800, cursor: "pointer" };
