"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../../lib/supabase";

const BGN_TO_EUR = 1.95583;

export default function SubmitBidPage({ params }: { params: { id: string } }) {
  const [auction, setAuction] = useState<any>(null);
  const [invoice, setInvoice] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [capture, setCapture] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function loadData() {
    setLoading(true);

    try {
      const { data: auctionData } = await supabase
        .from("auctions")
        .select("*")
        .eq("id", params.id)
        .single();

      setAuction(auctionData || null);

      if (!auctionData?.source_invoice_id) return;

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
          body: JSON.stringify({ invoiceId: auctionData.source_invoice_id }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          setCapture(result.capture);
        }
      } catch {
        setCapture(null);
      }
    } finally {
      setLoading(false);
    }
  }

  function updateField(name: string, value: any) {
    if (submitted || saving) return;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

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

  const dayShare =
    totalKwh > 0 ? dayKwh / totalKwh : safeShare(profile?.day_share);

  const nightShare =
    totalKwh > 0 ? nightKwh / totalKwh : safeShare(profile?.night_share);

  const avgDayLoadKw =
    toNumber(profile?.avg_day_load_kw) || calculateAverageLoad(dayKwh, 14, 28);

  const avgNightLoadKw =
    toNumber(profile?.avg_night_load_kw) ||
    calculateAverageLoad(nightKwh, 10, 28);

  const capturePriceEurMwh = toNumber(capture?.expected_capture_price_eur_mwh);

  const capturePriceBgnMwh = capturePriceEurMwh
    ? capturePriceEurMwh * BGN_TO_EUR
    : null;

  const profileDescription = buildProfileDescription(
    dayShare,
    nightShare,
    avgDayLoadKw,
    avgNightLoadKw
  );

  const deliveryEnd = calculateDeliveryEnd(
    auction?.delivery_start,
    auction?.duration_months
  );

  const fixedTotalBgn = calculateFixedTotalBgn();
  const indexedTotalBgn = calculateIndexedTotalBgn();
  const hybridTotalBgn = calculateHybridTotalBgn();

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

      estimated_total_bgn: fixedTotalBgn,
      indexed_estimated_total_bgn: indexedTotalBgn,
      hybrid_estimated_total_bgn: hybridTotalBgn,

      contract_duration_months: auction?.duration_months || null,
      delivery_start: auction?.delivery_start || null,
      delivery_end: deliveryEnd,

      valid_until: null,
      payment_terms: form.payment_terms || null,
      notes: form.notes || null,

      currency: "BGN",
      vat_included: form.vat_included,
      includes_network_components: form.includes_network_components,
      includes_balancing: form.includes_balancing,
      includes_green_energy: form.includes_green_energy,
      weekend_included: form.weekend_included,

      profile_comment: profileDescription,
      status: "submitted_locked",
      is_locked: true,
      locked_at: new Date().toISOString(),
    });

    setSaving(false);

    if (error) {
      setMessage(`Грешка при подаване на офертата: ${error.message}`);
      return;
    }

    setSubmitted(true);
    setMessage("Офертата е подадена успешно и е заключена. Не може да бъде редактирана.");
  }

  function calculateFixedTotalBgn() {
    if (!form.offer_fixed_enabled) return null;

    const quantityMwh = toNumber(auction?.quantity_mwh);
    const price = toNumber(form.fixed_price_bgn_mwh);

    if (!quantityMwh || !price) return null;

    return quantityMwh * price;
  }

  function calculateIndexedTotalBgn() {
    if (!form.offer_indexed_enabled) return null;

    const quantityMwh = toNumber(auction?.quantity_mwh);
    const capture = capturePriceBgnMwh || 0;
    const adder = toNumber(form.day_ahead_adder_bgn_mwh);
    const balancing = toNumber(form.balancing_adder_bgn_mwh);

    if (!quantityMwh) return null;

    return quantityMwh * (capture + adder + balancing);
  }

  function calculateHybridTotalBgn() {
    if (!form.offer_hybrid_enabled) return null;

    const quantityMwh = toNumber(auction?.quantity_mwh);
    const fixedPrice = toNumber(form.hybrid_fixed_price_bgn_mwh);
    const indexedPrice =
      (capturePriceBgnMwh || 0) + toNumber(form.day_ahead_adder_bgn_mwh);

    const fixedShare = toNumber(form.hybrid_fixed_share_percent) / 100;
    const indexedShare = toNumber(form.hybrid_indexed_share_percent) / 100;

    if (!quantityMwh || !fixedPrice) return null;

    return (
      quantityMwh * fixedPrice * fixedShare +
      quantityMwh * indexedPrice * indexedShare
    );
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
          <h1>Търгът не е намерен.</h1>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <Link href={`/auction/${params.id}/bids`} style={backLinkStyle}>
          ← Назад към офертите
        </Link>

        <section style={heroCardStyle}>
          <div>
            <div style={badgeStyle}>Подаване на оферта</div>
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

        <section style={cardStyle}>
          <h2>Информация за търга</h2>

          <div style={gridStyle}>
            <Info label="Количество" value={formatMWh(auction.quantity_mwh)} />
            <Info label="Начална дата" value={formatDate(auction.delivery_start)} />
            <Info label="Крайна дата" value={formatDate(deliveryEnd)} />
            <Info label="Срок" value={formatMonths(auction.duration_months)} />
            <Info label="Среден дневен товар" value={formatKW(avgDayLoadKw)} />
            <Info label="Среден нощен товар" value={formatKW(avgNightLoadKw)} />
            <Info label="Capture price" value={formatBGNPerMWh(capturePriceBgnMwh)} />
            <Info label="Capture price" value={formatEURPerMWh(capturePriceEurMwh)} />
            <Info label="Дневен дял" value={formatPercent(dayShare)} />
            <Info label="Нощен дял" value={formatPercent(nightShare)} />
            <Info label="Работи събота/неделя" value={detectWeekendWork(profile, invoice)} />
            <Info label="Профил" value={profile?.profile_type || "Изчислен от фактура"} />
          </div>

          <div style={descriptionBoxStyle}>
            <strong>Описание на профила:</strong>
            <p>{profileDescription}</p>
          </div>
        </section>

        {submitted && (
          <section style={lockedNoticeStyle}>
            <h2>Офертата е заключена</h2>
            <p>
              Подадената оферта е записана като окончателна и не може да бъде
              редактирана през тази форма.
            </p>
          </section>
        )}

        {!submitted && (
          <>
            <section style={cardStyle}>
              <h2>Данни за търговеца</h2>

              <div style={gridStyle}>
                <Field label="Име на доставчик" value={form.supplier_name} onChange={(value) => updateField("supplier_name", value)} required />
                <Field label="Лице за контакт" value={form.contact_person} onChange={(value) => updateField("contact_person", value)} />
                <Field label="Имейл" value={form.supplier_email} onChange={(value) => updateField("supplier_email", value)} />
                <Field label="Телефон" value={form.supplier_phone} onChange={(value) => updateField("supplier_phone", value)} />
              </div>
            </section>

            <form onSubmit={submitBid}>
              <section style={cardStyle}>
                <h2>Варианти на офертата</h2>

                <OfferBox title="Вариант 1: Фиксирана цена">
                  <Checkbox label="Подавам оферта за фиксирана цена" checked={form.offer_fixed_enabled} onChange={(value) => updateField("offer_fixed_enabled", value)} />

                  <div style={gridStyle}>
                    <Field label="Фиксирана цена BGN/MWh" type="number" value={form.fixed_price_bgn_mwh} onChange={(value) => updateField("fixed_price_bgn_mwh", value)} />
                    <Field label="Валидна до дата и час" type="datetime-local" value={form.fixed_valid_until} onChange={(value) => updateField("fixed_valid_until", value)} />
                    <Info label="Прогнозна стойност" value={formatBGN(fixedTotalBgn)} />
                  </div>
                </OfferBox>

                <OfferBox title="Вариант 2: Борсова цена + добавка">
                  <Checkbox label="Подавам оферта за борсова цена + добавка" checked={form.offer_indexed_enabled} onChange={(value) => updateField("offer_indexed_enabled", value)} />

                  <div style={gridStyle}>
                    <Info label="Capture база" value={formatBGNPerMWh(capturePriceBgnMwh)} />
                    <Field label="Day-ahead добавка BGN/MWh" type="number" value={form.day_ahead_adder_bgn_mwh} onChange={(value) => updateField("day_ahead_adder_bgn_mwh", value)} />
                    <Field label="Балансиране BGN/MWh" type="number" value={form.balancing_adder_bgn_mwh} onChange={(value) => updateField("balancing_adder_bgn_mwh", value)} />
                    <Field label="Валидна до дата и час" type="datetime-local" value={form.indexed_valid_until} onChange={(value) => updateField("indexed_valid_until", value)} />
                    <Info label="Прогнозна стойност" value={formatBGN(indexedTotalBgn)} />
                  </div>
                </OfferBox>

                <OfferBox title="Вариант 3: Хибридна цена">
                  <Checkbox label="Подавам оферта за хибридна цена" checked={form.offer_hybrid_enabled} onChange={(value) => updateField("offer_hybrid_enabled", value)} />

                  <div style={gridStyle}>
                    <Field label="Фиксирана част BGN/MWh" type="number" value={form.hybrid_fixed_price_bgn_mwh} onChange={(value) => updateField("hybrid_fixed_price_bgn_mwh", value)} />
                    <Field label="Фиксиран дял %" type="number" value={form.hybrid_fixed_share_percent} onChange={(value) => updateField("hybrid_fixed_share_percent", value)} />
                    <Field label="Борсов дял %" type="number" value={form.hybrid_indexed_share_percent} onChange={(value) => updateField("hybrid_indexed_share_percent", value)} />
                    <Field label="Валидна до дата и час" type="datetime-local" value={form.hybrid_valid_until} onChange={(value) => updateField("hybrid_valid_until", value)} />
                    <Info label="Борсова база" value={formatBGNPerMWh(capturePriceBgnMwh)} />
                    <Info label="Прогнозна стойност" value={formatBGN(hybridTotalBgn)} />
                  </div>
                </OfferBox>
              </section>

              <section style={cardStyle}>
                <h2>Общи условия</h2>

                <div style={checkboxGridStyle}>
                  <Checkbox label="Цената включва ДДС" checked={form.vat_included} onChange={(value) => updateField("vat_included", value)} />
                  <Checkbox label="Включени мрежови компоненти" checked={form.includes_network_components} onChange={(value) => updateField("includes_network_components", value)} />
                  <Checkbox label="Включено балансиране" checked={form.includes_balancing} onChange={(value) => updateField("includes_balancing", value)} />
                  <Checkbox label="Зелена енергия" checked={form.includes_green_energy} onChange={(value) => updateField("includes_green_energy", value)} />
                  <Checkbox label="Офертата отчита работа събота/неделя" checked={form.weekend_included} onChange={(value) => updateField("weekend_included", value)} />
                </div>

                <div style={gridStyle}>
                  <Field label="Условия на плащане" value={form.payment_terms} onChange={(value) => updateField("payment_terms", value)} />
                  <Field label="Бележки" value={form.notes} onChange={(value) => updateField("notes", value)} />
                </div>

                {message && <div style={messageStyle}>{message}</div>}

                <button type="submit" disabled={saving} style={submitButtonStyle}>
                  {saving ? "Записване..." : "Подай и заключи офертата"}
                </button>
              </section>
            </form>
          </>
        )}

        {submitted && message && <div style={messageStyle}>{message}</div>}
      </div>
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

function buildProfileDescription(
  dayShare: number,
  nightShare: number,
  avgDayLoadKw: number,
  avgNightLoadKw: number
) {
  if (dayShare >= 0.65) {
    return "Профилът е предимно дневен. Основната консумация е в активните дневни часове, което е важно при офериране на борсова цена и при оценка на capture price.";
  }

  if (nightShare >= 0.5) {
    return "Профилът има значима нощна консумация. Това може да намали средната борсова експозиция, но трябва да се отчете при балансиране и прогнозиране.";
  }

  if (avgDayLoadKw > avgNightLoadKw * 1.5) {
    return "Товарът е по-висок през деня, но има и базово нощно потребление. Подходящи са фиксирана или хибридна оферта.";
  }

  return "Профилът е относително балансиран между дневна и нощна консумация. Препоръчително е доставчикът да оцени както фиксирана, така и борсова оферта.";
}

function detectWeekendWork(profile: any, invoice: any) {
  const value =
    profile?.weekend_correction_factor ??
    profile?.weekend_share ??
    invoice?.weekend_correction_factor ??
    invoice?.works_weekend;

  if (value === true) return "Да";
  if (value === false) return "Не";

  const number = toNumber(value);

  if (number >= 0.15) return "Вероятно да";
  if (number > 0) return "Ограничено";
  return "Няма данни";
}

function calculateAverageLoad(kwh: number, hoursPerDay: number, days: number) {
  if (!kwh || !hoursPerDay || !days) return 0;
  return kwh / (hoursPerDay * days);
}

function calculateDeliveryEnd(startDate: string, months: number) {
  if (!startDate || !months) return null;

  const date = new Date(startDate);
  date.setMonth(date.getMonth() + Number(months));
  date.setDate(date.getDate() - 1);

  return date.toISOString().slice(0, 10);
}

function toIsoDateTime(value: string) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function toNumber(value: any) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toNullableNumber(value: any) {
  const number = Number(value);
  return Number.isFinite(number) && value !== "" ? number : null;
}

function safeShare(value: any) {
  const number = toNumber(value);
  if (number > 1) return Math.min(1, number / 100);
  return Math.max(0, Math.min(1, number));
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
  background: "linear-gradient(135deg,#064e3b,#0369a1)",
  color: "white",
  padding: 32,
  borderRadius: 28,
  display: "flex",
  justifyContent: "space-between",
  gap: 24,
  alignItems: "center",
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
};

const heroMetricStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.16)",
  padding: 22,
  borderRadius: 22,
  minWidth: 220,
  textAlign: "center",
};

const cardStyle: React.CSSProperties = {
  background: "white",
  padding: 28,
  borderRadius: 24,
  boxShadow: "0 14px 40px rgba(15,23,42,0.08)",
  marginTop: 26,
};

const lockedNoticeStyle: React.CSSProperties = {
  background: "#ecfdf5",
  padding: 28,
  borderRadius: 24,
  border: "1px solid #86efac",
  color: "#065f46",
  marginTop: 26,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
  marginTop: 18,
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

const descriptionBoxStyle: React.CSSProperties = {
  marginTop: 22,
  padding: 18,
  borderRadius: 18,
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1e3a8a",
};

const offerBoxStyle: React.CSSProperties = {
  marginTop: 22,
  padding: 22,
  borderRadius: 20,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const labelStyle: React.CSSProperties = {
  color: "#334155",
  fontWeight: 700,
  fontSize: 14,
};

const inputStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid #cbd5e1",
  fontSize: 15,
};

const checkboxGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 12,
  marginTop: 24,
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

const submitButtonStyle: React.CSSProperties = {
  marginTop: 24,
  padding: "14px 22px",
  borderRadius: 16,
  border: 0,
  background: "#2563eb",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};
    </main>
  );
}
