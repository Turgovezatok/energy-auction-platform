"use client";

import useSWR from "swr";

type Capture = {
  source: "profile-file" | "invoice-tariff" | "flat";
  priceSource: "exchange-15m" | "monthly-summary";
  approximate: boolean;
  periodFrom: string;
  periodTo: string;
  basePrice: number;
  peakPrice: number;
  offpeakPrice: number;
  capturePrice: number;
  profileFactor: number;
  riskScore: number;
  riskLevel: "low" | "medium" | "high";
  recommendedModel: "fixed-price" | "hybrid" | "day-ahead-plus-adder";
  profileNote: string | null;
  paidPrice: number | null;
};

type CaptureSummaryProps = {
  invoiceId: string;
  file: File | null;
  worksSaturday: boolean;
  worksSunday: boolean;
  monthlyMwh: number;
};

const SOURCE_LABEL: Record<Capture["source"], string> = {
  "profile-file": "по вашия товаров профил",
  "invoice-tariff": "по дневна/нощна тарифа от фактурата",
  flat: "при равномерно потребление",
};

const RISK: Record<Capture["riskLevel"], { label: string; className: string }> = {
  low: { label: "нисък", className: "bg-success" },
  medium: { label: "среден", className: "bg-warning" },
  high: { label: "висок", className: "bg-danger" },
};

const MODEL_LABEL: Record<Capture["recommendedModel"], string> = {
  "fixed-price": "Фиксирана цена",
  hybrid: "Добавка + процент",
  "day-ahead-plus-adder": "Добавка към борсова цена",
};

async function fetchCapture([, invoiceId, file, sat, sun]: [
  string,
  string,
  File | null,
  boolean,
  boolean,
]): Promise<Capture> {
  const body = new FormData();
  body.set("invoiceId", invoiceId);
  body.set("worksSaturday", String(sat));
  body.set("worksSunday", String(sun));
  if (file) body.set("file", file);

  const res = await fetch("/api/pre-auction-capture", { method: "POST", body });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(json?.error || "Изчислението не успя.");
  }
  return json.capture;
}

function eur(value: number) {
  return `${value.toLocaleString("bg-BG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/MWh`;
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export default function CaptureSummary({
  invoiceId,
  file,
  worksSaturday,
  worksSunday,
  monthlyMwh,
}: CaptureSummaryProps) {
  const { data, error, isLoading, mutate } = useSWR(
    ["pre-auction-capture", invoiceId, file, worksSaturday, worksSunday] as [
      string,
      string,
      File | null,
      boolean,
      boolean,
    ],
    fetchCapture,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  return (
    <section aria-labelledby="capture-title" className="mt-5 border-t border-white-light pt-5 dark:border-[#1b2e4b]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 id="capture-title" className="font-semibold dark:text-white-light">
          Пазарен capture
        </h3>
        {data?.approximate && (
          <span className="badge badge-outline-warning">приблизително</span>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-white-dark" role="status">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-l-transparent" />
          Изчисляваме по борсовите цени...
        </div>
      )}

      {error && !isLoading && (
        <div className="text-sm text-danger">
          {error.message}{" "}
          <button type="button" onClick={() => mutate()} className="font-semibold underline">
            Опитай пак
          </button>
        </div>
      )}

      {data && !isLoading && (
        <>
          <div className="rounded-md bg-success-light p-4 dark:bg-success-dark-light">
            <div className="text-xs text-white-dark">Очаквана capture цена</div>
            <div className="mt-1 text-2xl font-bold text-success">{eur(data.capturePrice)}</div>
            <div className="mt-1 text-xs text-white-dark">{SOURCE_LABEL[data.source]}</div>
          </div>

          <dl className="mt-4 flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-white-dark">Base (средна борсова)</dt>
              <dd className="font-semibold">{eur(data.basePrice)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white-dark">Peak / Off-peak</dt>
              <dd className="text-right font-semibold">
                {data.peakPrice.toFixed(2)} / {data.offpeakPrice.toFixed(2)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white-dark">Профилен фактор</dt>
              <dd className="font-semibold">{data.profileFactor.toFixed(3)}</dd>
            </div>
            {data.paidPrice !== null && (
              <div className="flex justify-between gap-4">
                <dt className="text-white-dark">Платена цена (фактура)</dt>
                <dd className="font-semibold">{eur(data.paidPrice)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-white-dark">Месечна енергия (прибл.)</dt>
              <dd className="font-semibold">
                {(data.capturePrice * monthlyMwh).toLocaleString("bg-BG", { maximumFractionDigits: 0 })} €
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-white-dark">Риск</dt>
              <dd>
                <span className={`badge ${RISK[data.riskLevel].className}`}>
                  {RISK[data.riskLevel].label} · {data.riskScore}/100
                </span>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white-dark">Препоръчан модел</dt>
              <dd className="text-right font-semibold">{MODEL_LABEL[data.recommendedModel]}</dd>
            </div>
          </dl>

          {data.profileNote && (
            <p className="mt-3 text-xs text-warning">{data.profileNote}</p>
          )}

          <p className="mt-3 text-xs text-white-dark">
            {data.priceSource === "exchange-15m"
              ? `Борсови цени IBEX ден напред, ${formatDate(data.periodFrom)} – ${formatDate(data.periodTo)}.`
              : "Месечни цени от админ таблицата (липсват 15-минутни данни)."}
            {data.source !== "profile-file" && " Приложете товаров профил за точно изчисление."}
          </p>
        </>
      )}
    </section>
  );
}
