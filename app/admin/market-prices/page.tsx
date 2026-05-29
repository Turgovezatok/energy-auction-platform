"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function MarketPricesAdminPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const [basePrice, setBasePrice] = useState("");
  const [peakPrice, setPeakPrice] = useState("");
  const [offpeakPrice, setOffpeakPrice] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [source, setSource] = useState("IBEX / БНЕБ месечен доклад");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadRows();
  }, []);

  function toNumber(value: string) {
    if (!value) return null;
    const n = Number(value.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  async function loadRows() {
    const { data, error } = await supabase
      .from("market_monthly_summary")
      .select("*")
      .order("year", { ascending: false })
      .order("month", { ascending: false });

    if (error) {
      alert("Грешка при зареждане:\n\n" + error.message);
      return;
    }

    setRows(data || []);
  }

  async function saveRow() {
    if (!year || !month) {
      alert("Попълнете година и месец.");
      return;
    }

    setSaving(true);

    try {
      const base = toNumber(basePrice);
      const peak = toNumber(peakPrice);
      const offpeak = toNumber(offpeakPrice);
      const min = toNumber(minPrice);
      const max = toNumber(maxPrice);

      const spread =
        max !== null && min !== null
          ? Number((max - min).toFixed(3))
          : null;

      const volatility =
        spread !== null && base && base > 0
          ? Number((spread / base).toFixed(4))
          : null;

      const payload = {
        year: Number(year),
        month: Number(month),
        base_price_eur_mwh: base,
        peak_price_eur_mwh: peak,
        offpeak_price_eur_mwh: offpeak,
        min_price_eur_mwh: min,
        max_price_eur_mwh: max,
        spread_eur_mwh: spread,
        volatility_score: volatility,
        source,
        notes,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("market_monthly_summary")
        .upsert(payload, {
          onConflict: "year,month",
        });

      if (error) {
        throw new Error(error.message);
      }

      alert("Пазарните цени са записани ✅");

      setBasePrice("");
      setPeakPrice("");
      setOffpeakPrice("");
      setMinPrice("");
      setMaxPrice("");
      setNotes("");

      await loadRows();
    } catch (error) {
      alert(
        "Грешка при запис:\n\n" +
          (error instanceof Error ? error.message : String(error))
      );
    }

    setSaving(false);
  }

  function editRow(row: any) {
    setYear(row.year);
    setMonth(row.month);
    setBasePrice(row.base_price_eur_mwh?.toString() || "");
    setPeakPrice(row.peak_price_eur_mwh?.toString() || "");
    setOffpeakPrice(row.offpeak_price_eur_mwh?.toString() || "");
    setMinPrice(row.min_price_eur_mwh?.toString() || "");
    setMaxPrice(row.max_price_eur_mwh?.toString() || "");
    setSource(row.source || "IBEX / БНЕБ месечен доклад");
    setNotes(row.notes || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <h1>Пазарни месечни цени</h1>

        <p style={mutedStyle}>
          Въвеждане на исторически данни от БНЕБ / IBEX за Base, Peak,
          Off-peak, минимална и максимална цена. Тези данни ще се използват за
          capture analysis и risk card.
        </p>

        <section style={cardStyle}>
          <h2>Добави / редактирай месец</h2>

          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>Година</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Месец</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                style={inputStyle}
              >
                {[
                  ["Януари", 1],
                  ["Февруари", 2],
                  ["Март", 3],
                  ["Април", 4],
                  ["Май", 5],
                  ["Юни", 6],
                  ["Юли", 7],
                  ["Август", 8],
                  ["Септември", 9],
                  ["Октомври", 10],
                  ["Ноември", 11],
                  ["Декември", 12],
                ].map(([label, value]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <Field
              label="Base price, €/MWh"
              value={basePrice}
              onChange={setBasePrice}
            />

            <Field
              label="Peak price, €/MWh"
              value={peakPrice}
              onChange={setPeakPrice}
            />

            <Field
              label="Off-peak price, €/MWh"
              value={offpeakPrice}
              onChange={setOffpeakPrice}
            />

            <Field
              label="Min price, €/MWh"
              value={minPrice}
              onChange={setMinPrice}
            />

            <Field
              label="Max price, €/MWh"
              value={maxPrice}
              onChange={setMaxPrice}
            />
          </div>

          <label style={labelStyle}>Източник</label>
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            style={inputStyle}
          />

          <label style={labelStyle}>Бележки</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{
              ...inputStyle,
              minHeight: 90,
            }}
          />

          <button onClick={saveRow} disabled={saving} style={buttonStyle}>
            {saving ? "Записва..." : "Запиши месец"}
          </button>
        </section>

        <section style={cardStyle}>
          <h2>Въведени месеци</h2>

          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={th}>Година</th>
                  <th style={th}>Месец</th>
                  <th style={th}>Base</th>
                  <th style={th}>Peak</th>
                  <th style={th}>Off-peak</th>
                  <th style={th}>Min</th>
                  <th style={th}>Max</th>
                  <th style={th}>Spread</th>
                  <th style={th}>Volatility</th>
                  <th style={th}>Action</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td style={td}>{row.year}</td>
                    <td style={td}>{row.month}</td>
                    <td style={td}>{row.base_price_eur_mwh ?? "—"}</td>
                    <td style={td}>{row.peak_price_eur_mwh ?? "—"}</td>
                    <td style={td}>{row.offpeak_price_eur_mwh ?? "—"}</td>
                    <td style={td}>{row.min_price_eur_mwh ?? "—"}</td>
                    <td style={td}>{row.max_price_eur_mwh ?? "—"}</td>
                    <td style={td}>{row.spread_eur_mwh ?? "—"}</td>
                    <td style={td}>{row.volatility_score ?? "—"}</td>
                    <td style={td}>
                      <button onClick={() => editRow(row)} style={smallButton}>
                        Редактирай
                      </button>
                    </td>
                  </tr>
                ))}

                {rows.length === 0 && (
                  <tr>
                    <td style={td} colSpan={10}>
                      Няма въведени данни.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="пример: 95.42"
        style={inputStyle}
      />
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f3f6fb",
  padding: 40,
  fontFamily: "Arial",
};

const containerStyle: React.CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
};

const mutedStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 17,
  lineHeight: 1.6,
};

const cardStyle: React.CSSProperties = {
  background: "white",
  padding: 28,
  borderRadius: 24,
  boxShadow: "0 14px 40px rgba(15,23,42,0.08)",
  marginTop: 28,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 18,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontWeight: 700,
  marginTop: 16,
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 13,
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  fontSize: 16,
};

const buttonStyle: React.CSSProperties = {
  marginTop: 24,
  padding: "14px 22px",
  borderRadius: 14,
  border: 0,
  background: "#059669",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: 18,
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: 12,
  borderBottom: "2px solid #0f172a",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: 12,
  borderBottom: "1px solid #e2e8f0",
  whiteSpace: "nowrap",
};

const smallButton: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "white",
  cursor: "pointer",
};
