"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ForecastPage() {
  const [data, setData] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [latestRun, setLatestRun] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const result = await supabase
        .from("price_forecast_results")
        .select(
          "timestamp_utc, forecast_price_eur_mwh, generation_forecast_mw, eso_load_forecast_mw, real_system_margin_mw, real_system_ratio, created_at"
        )
        .order("timestamp_utc", { ascending: false })
        .limit(24);

      if (result.error) {
        setErrorMessage(result.error.message);
        return;
      }

      const rows = [...(result.data || [])].sort(
        (a, b) =>
          new Date(a.timestamp_utc).getTime() -
          new Date(b.timestamp_utc).getTime()
      );

      setData(rows);

      if (rows.length > 0) {
        const latestCreatedAt = rows.reduce((latest, row) => {
          if (!latest) return row.created_at;

          return new Date(row.created_at).getTime() >
            new Date(latest).getTime()
            ? row.created_at
            : latest;
        }, null as string | null);

        setLatestRun(latestCreatedAt);
      }
    }

    loadData();
  }, []);

  const chartData = useMemo(
    () =>
      data.map((row) => ({
        time: new Date(row.timestamp_utc).toLocaleString("bg-BG", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
        price: Number(row.forecast_price_eur_mwh),
      })),
    [data]
  );

  if (errorMessage) {
    return <div className="p-6">Грешка: {errorMessage}</div>;
  }

  if (!data.length) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-7xl rounded-2xl bg-white p-6 shadow-sm">
          Няма налични прогнозни данни.
        </div>
      </main>
    );
  }

  const minPrice = Math.min(...chartData.map((d) => d.price));
  const maxPrice = Math.max(...chartData.map((d) => d.price));
  const avgPrice =
    chartData.reduce((sum, d) => sum + d.price, 0) /
    Math.max(chartData.length, 1);
  const spread = maxPrice - minPrice;

  const cheapest = [...data]
    .sort(
      (a, b) =>
        Number(a.forecast_price_eur_mwh) -
        Number(b.forecast_price_eur_mwh)
    )
    .slice(0, 4);

  const mostExpensive = [...data]
    .sort(
      (a, b) =>
        Number(b.forecast_price_eur_mwh) -
        Number(a.forecast_price_eur_mwh)
    )
    .slice(0, 4);

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">
            EnergyBid Forecast
          </h1>
          <p className="text-slate-600">
            Последна прогноза:{" "}
            {latestRun
              ? new Date(latestRun).toLocaleString("bg-BG")
              : "зарежда..."}
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Минимална цена</div>
            <div className="text-2xl font-bold">
              {minPrice.toFixed(2)} €/MWh
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Максимална цена</div>
            <div className="text-2xl font-bold">
              {maxPrice.toFixed(2)} €/MWh
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Средна цена</div>
            <div className="text-2xl font-bold">
              {avgPrice.toFixed(2)} €/MWh
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Spread</div>
            <div className="text-2xl font-bold">
              {spread.toFixed(2)} €/MWh
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">
            Прогнозна цена €/MWh
          </h2>

          <div className="h-[420px] w-full">
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} minTickGap={24} />
                <YAxis domain={["dataMin - 5", "dataMax + 5"]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  name="Цена €/MWh"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-lg font-semibold">4 най-евтини часа</h3>
            {cheapest.map((row) => (
              <div
                key={row.timestamp_utc}
                className="flex justify-between border-b py-2"
              >
                <span>{new Date(row.timestamp_utc).toLocaleString("bg-BG")}</span>
                <strong>
                  {Number(row.forecast_price_eur_mwh).toFixed(2)} €/MWh
                </strong>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-lg font-semibold">4 най-скъпи часа</h3>
            {mostExpensive.map((row) => (
              <div
                key={row.timestamp_utc}
                className="flex justify-between border-b py-2"
              >
                <span>{new Date(row.timestamp_utc).toLocaleString("bg-BG")}</span>
                <strong>
                  {Number(row.forecast_price_eur_mwh).toFixed(2)} €/MWh
                </strong>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl bg-white p-6 shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left">
                <th className="px-3 py-3">Време</th>
                <th className="px-3 py-3">Цена €/MWh</th>
                <th className="px-3 py-3">Generation MW</th>
                <th className="px-3 py-3">ESO Load MW</th>
                <th className="px-3 py-3">System Margin MW</th>
                <th className="px-3 py-3">System Ratio</th>
              </tr>
            </thead>

            <tbody>
              {data.map((row) => (
                <tr key={row.timestamp_utc} className="border-b hover:bg-slate-50">
                  <td className="px-3 py-2">
                    {new Date(row.timestamp_utc).toLocaleString("bg-BG")}
                  </td>
                  <td className="px-3 py-2 font-semibold">
                    {Number(row.forecast_price_eur_mwh).toFixed(2)}
                  </td>
                  <td className="px-3 py-2">
                    {row.generation_forecast_mw == null
                      ? "-"
                      : Number(row.generation_forecast_mw).toFixed(0)}
                  </td>
                  <td className="px-3 py-2">
                    {row.eso_load_forecast_mw == null
                      ? "-"
                      : Number(row.eso_load_forecast_mw).toFixed(0)}
                  </td>
                  <td className="px-3 py-2">
                    {row.real_system_margin_mw == null
                      ? "-"
                      : Number(row.real_system_margin_mw).toFixed(0)}
                  </td>
                  <td className="px-3 py-2">
                    {row.real_system_ratio == null
                      ? "-"
                      : Number(row.real_system_ratio).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
