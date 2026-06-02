{submitted && message && <div style={messageStyle}>{message}</div>}
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
