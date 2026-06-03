"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "../../../../lib/supabase";

export default function SubmitBidPage({
  params,
}: {
  params: { id: string };
}) {
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    supplier_name: "",
    supplier_email: "",
    supplier_phone: "",
    contact_person: "",

    offer_fixed_enabled: true,
    fixed_price_bgn_mwh: "",
    fixed_valid_until: "",

    offer_indexed_enabled: true,
    day_ahead_adder_bgn_mwh: "",
    balancing_adder_bgn_mwh: "",
    indexed_valid_until: "",

    offer_hybrid_enabled: true,
    hybrid_fixed_price_bgn_mwh: "",
    hybrid_fixed_share_percent: "50",
    hybrid_indexed_share_percent: "50",
    hybrid_valid_until: "",

    payment_terms: "",
    notes: "",

    vat_included: false,
    includes_network_components: false,
    includes_balancing: true,
    includes_green_energy: false,
    weekend_included: false,
  });

  function updateField(name: string, value: any) {
    if (saving || submitted) return;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function toNullableNumber(value: string) {
    if (value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function toIsoDateTime(value: string) {
    if (!value) return null;
    return new Date(value).toISOString();
  }

  async function submitBid(event: React.FormEvent) {
    event.preventDefault();

    if (submitted) return;

    setSaving(true);
    setMessage("");

    const { error } = await supabase.from("auction_bids").insert({
      auction_id: params.id,

      supplier_name: form.supplier_name,
      supplier_email: form.supplier_email || null,
      supplier_phone: form.supplier_phone || null,
      contact_person: form.contact_person || null,

      pricing_model: "multi_variant",

      offer_fixed_enabled: form.offer_fixed_enabled,
      offer_indexed_enabled: form.offer_indexed_enabled,
      offer_hybrid_enabled: form.offer_hybrid_enabled,

      fixed_price_bgn_mwh: form.offer_fixed_enabled
        ? toNullableNumber(form.fixed_price_bgn_mwh)
        : null,
      fixed_valid_until: form.offer_fixed_enabled
        ? toIsoDateTime(form.fixed_valid_until)
        : null,

      day_ahead_adder_bgn_mwh:
        form.offer_indexed_enabled || form.offer_hybrid_enabled
          ? toNullableNumber(form.day_ahead_adder_bgn_mwh)
          : null,

      balancing_adder_bgn_mwh: form.offer_indexed_enabled
        ? toNullableNumber(form.balancing_adder_bgn_mwh)
        : null,

      indexed_valid_until: form.offer_indexed_enabled
        ? toIsoDateTime(form.indexed_valid_until)
        : null,

      hybrid_fixed_price_bgn_mwh: form.offer_hybrid_enabled
        ? toNullableNumber(form.hybrid_fixed_price_bgn_mwh)
        : null,

      hybrid_fixed_share_percent: form.offer_hybrid_enabled
        ? toNullableNumber(form.hybrid_fixed_share_percent)
        : null,

      hybrid_indexed_share_percent: form.offer_hybrid_enabled
        ? toNullableNumber(form.hybrid_indexed_share_percent)
        : null,

      hybrid_valid_until: form.offer_hybrid_enabled
        ? toIsoDateTime(form.hybrid_valid_until)
        : null,

      payment_terms: form.payment_terms || null,
      notes: form.notes || null,

      currency: "BGN",
      vat_included: form.vat_included,
      includes_network_components: form.includes_network_components,
      includes_balancing: form.includes_balancing,
      includes_green_energy: form.includes_green_energy,
      weekend_included: form.weekend_included,

      status: "submitted_locked",
      is_locked: true,
      locked_at: new Date().toISOString(),
    });

    setSaving(false);

    if (error) {
      setMessage(`Грешка: ${error.message}`);
      return;
    }

    setSubmitted(true);
    setMessage("Офертата е подадена успешно и е заключена.");
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <Link href={`/auction/${params.id}/bids`} style={backLinkStyle}>
          ← Назад към офертите
        </Link>

        <section style={heroStyle}>
          <h1>Подаване на оферта</h1>
          <p>
            Подайте една оферта с един номер, съдържаща до три ценови варианта.
          </p>
        </section>

        {submitted ? (
          <section style={successStyle}>
            <h2>Офертата е заключена</h2>
            <p>{message}</p>
            <Link href={`/auction/${params.id}/bids`} style={primaryLinkStyle}>
              Виж офертите
            </Link>
          </section>
        ) : (
          <form onSubmit={submitBid}>
            <section style={cardStyle}>
              <h2>Данни за търговеца</h2>

              <div style={gridStyle}>
                <Field
                  label="Име на доставчик"
                  value={form.supplier_name}
                  onChange={(value) => updateField("supplier_name", value)}
                  required
                />

                <Field
                  label="Лице за контакт"
                  value={form.contact_person}
                  onChange={(value) => updateField("contact_person", value)}
                />

                <Field
                  label="Имейл"
                  value={form.supplier_email}
                  onChange={(value) => updateField("supplier_email", value)}
                />

                <Field
                  label="Телефон"
                  value={form.supplier_phone}
                  onChange={(value) => updateField("supplier_phone", value)}
                />
              </div>
            </section>

            <section style={cardStyle}>
              <h2>Варианти на офертата</h2>

              <OfferBox title="Вариант 1: Фиксирана цена">
                <Checkbox
                  label="Подавам този вариант"
                  checked={form.offer_fixed_enabled}
                  onChange={(value) => updateField("offer_fixed_enabled", value)}
                />

                <div style={gridStyle}>
                  <Field
                    label="Фиксирана цена BGN/MWh"
                    type="number"
                    value={form.fixed_price_bgn_mwh}
                    onChange={(value) =>
                      updateField("fixed_price_bgn_mwh", value)
                    }
                  />

                  <Field
                    label="Валидна до дата и час"
                    type="datetime-local"
                    value={form.fixed_valid_until}
                    onChange={(value) =>
                      updateField("fixed_valid_until", value)
                    }
                  />
                </div>
              </OfferBox>

              <OfferBox title="Вариант 2: Борсова цена + добавка">
                <Checkbox
                  label="Подавам този вариант"
                  checked={form.offer_indexed_enabled}
                  onChange={(value) =>
                    updateField("offer_indexed_enabled", value)
                  }
                />

                <div style={gridStyle}>
                  <Field
                    label="Day-ahead добавка BGN/MWh"
                    type="number"
                    value={form.day_ahead_adder_bgn_mwh}
                    onChange={(value) =>
                      updateField("day_ahead_adder_bgn_mwh", value)
                    }
                  />

                  <Field
                    label="Балансиране BGN/MWh"
                    type="number"
                    value={form.balancing_adder_bgn_mwh}
                    onChange={(value) =>
                      updateField("balancing_adder_bgn_mwh", value)
                    }
                  />

                  <Field
                    label="Валидна до дата и час"
                    type="datetime-local"
                    value={form.indexed_valid_until}
                    onChange={(value) =>
                      updateField("indexed_valid_until", value)
                    }
                  />
                </div>
              </OfferBox>

              <OfferBox title="Вариант 3: Хибридна цена">
                <Checkbox
                  label="Подавам този вариант"
                  checked={form.offer_hybrid_enabled}
                  onChange={(value) => updateField("offer_hybrid_enabled", value)}
                />

                <div style={gridStyle}>
                  <Field
                    label="Фиксирана част BGN/MWh"
                    type="number"
                    value={form.hybrid_fixed_price_bgn_mwh}
                    onChange={(value) =>
                      updateField("hybrid_fixed_price_bgn_mwh", value)
                    }
                  />

                  <Field
                    label="Фиксиран дял %"
                    type="number"
                    value={form.hybrid_fixed_share_percent}
                    onChange={(value) =>
                      updateField("hybrid_fixed_share_percent", value)
                    }
                  />

                  <Field
                    label="Борсов дял %"
                    type="number"
                    value={form.hybrid_indexed_share_percent}
                    onChange={(value) =>
                      updateField("hybrid_indexed_share_percent", value)
                    }
                  />

                  <Field
                    label="Валидна до дата и час"
                    type="datetime-local"
                    value={form.hybrid_valid_until}
                    onChange={(value) =>
                      updateField("hybrid_valid_until", value)
                    }
                  />
                </div>
              </OfferBox>
            </section>

            <section style={cardStyle}>
              <h2>Общи условия</h2>

              <div style={checkboxGridStyle}>
                <Checkbox
                  label="Цената включва ДДС"
                  checked={form.vat_included}
                  onChange={(value) => updateField("vat_included", value)}
                />

                <Checkbox
                  label="Включени мрежови компоненти"
                  checked={form.includes_network_components}
                  onChange={(value) =>
                    updateField("includes_network_components", value)
                  }
                />

                <Checkbox
                  label="Включено балансиране"
                  checked={form.includes_balancing}
                  onChange={(value) => updateField("includes_balancing", value)}
                />

                <Checkbox
                  label="Зелена енергия"
                  checked={form.includes_green_energy}
                  onChange={(value) =>
                    updateField("includes_green_energy", value)
                  }
                />

                <Checkbox
                  label="Офертата отчита работа събота/неделя"
                  checked={form.weekend_included}
                  onChange={(value) => updateField("weekend_included", value)}
                />
              </div>

              <div style={gridStyle}>
                <Field
                  label="Условия на плащане"
                  value={form.payment_terms}
                  onChange={(value) => updateField("payment_terms", value)}
                />

                <Field
                  label="Бележки"
                  value={form.notes}
                  onChange={(value) => updateField("notes", value)}
                />
              </div>

              {message && <div style={messageStyle}>{message}</div>}

              <button type="submit" disabled={saving} style={buttonStyle}>
                {saving ? "Записване..." : "Подай и заключи офертата"}
              </button>
            </section>
          </form>
        )}
      </div>
    </main>
  );
}

function OfferBox({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={offerBoxStyle}>
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div style={fieldStyle}>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label style={checkboxStyle}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  padding: 40,
  background: "#f3f6fb",
  fontFamily: "Arial",
};

const containerStyle: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
};

const backLinkStyle: React.CSSProperties = {
  color: "#2563eb",
  fontWeight: 700,
  textDecoration: "none",
};

const heroStyle: React.CSSProperties = {
  background: "linear-gradient(135deg,#064e3b,#0369a1)",
  color: "white",
  padding: 32,
  borderRadius: 24,
  marginTop: 24,
};

const cardStyle: React.CSSProperties = {
  background: "white",
  padding: 28,
  borderRadius: 24,
  marginTop: 24,
  boxShadow: "0 14px 40px rgba(15,23,42,0.08)",
};

const successStyle: React.CSSProperties = {
  background: "#ecfdf5",
  padding: 28,
  borderRadius: 24,
  marginTop: 24,
  border: "1px solid #86efac",
  color: "#065f46",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
  marginTop: 16,
};

const checkboxGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 12,
  marginTop: 16,
};

const offerBoxStyle: React.CSSProperties = {
  background: "#f8fafc",
  padding: 22,
  borderRadius: 20,
  border: "1px solid #e2e8f0",
  marginTop: 22,
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const labelStyle: React.CSSProperties = {
  fontWeight: 700,
  color: "#334155",
};

const inputStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid #cbd5e1",
  fontSize: 15,
};

const checkboxStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  padding: 14,
  borderRadius: 14,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const messageStyle: React.CSSProperties = {
  marginTop: 20,
  padding: 16,
  borderRadius: 16,
  background: "#ecfdf5",
  color: "#065f46",
  fontWeight: 700,
};

const buttonStyle: React.CSSProperties = {
  marginTop: 24,
  padding: "14px 22px",
  borderRadius: 16,
  border: 0,
  background: "#2563eb",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};

const primaryLinkStyle: React.CSSProperties = {
  display: "inline-block",
  marginTop: 16,
  padding: "12px 18px",
  borderRadius: 14,
  background: "#2563eb",
  color: "white",
  textDecoration: "none",
  fontWeight: 800,
};
