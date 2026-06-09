"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    async function loadData() {
      const { data, error } = await supabase
        .from("price_forecast_results")
        .select(
          "timestamp_utc, forecast_price_eur_mwh, generation_forecast_mw, eso_load_forecast_mw, real_system_margin_mw, real_system_ratio"
        )
        .order("timestamp_utc", { ascending: true })
        .limit(72);

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setData(data || []);
    }

    loadData();
  }, []);

  const chartData = data.map((row) => ({
    time: new Date(row.timestamp_utc).toLocaleString("bg-BG", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
    }),
    price: Number(row.forecast_price_eur_mwh),
  }));

  if (errorMessage) {
    return <div className="p-6">Грешка: {errorMessage}</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-2 text-3xl font-bold">
          Прогноза за цена на електроенергия
        </h1>

        <p className="mb-8 text-slate-600">
          Визуализация на прогнозните цени от EnergyBid Forecast Engine.
        </p>

        <div className="mb-8 rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Прогнозна цена €/MWh</h2>

          <div style={{ width: "100%", height: 420 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="price"
                  strokeWidth={3}
                  dot={false}
                  name="Цена €/MWh"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl bg-white p-6 shadow">
          <table className="min-w-full border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-3 py-2">Време UTC</th>
                <th className="border px-3 py-2">Цена €/MWh</th>
                <th className="border px-3 py-2">Generation MW</th>
                <th className="border px-3 py-2">ESO Load MW</th>
                <th className="border px-3 py-2">System Margin MW</th>
                <th className="border px-3 py-2">System Ratio</th>
              </tr>
            </thead>

            <tbody>
              {data.map((row) => (
                <tr key={row.timestamp_utc}>
                  <td className="border px-3 py-2">
                    {new Date(row.timestamp_utc).toLocaleString("bg-BG")}
                  </td>
                  <td className="border px-3 py-2 font-semibold">
                    {Number(row.forecast_price_eur_mwh).toFixed(2)}
                  </td>
                  <td className="border px-3 py-2">
                    {row.generation_forecast_mw == null
                      ? "-"
                      : Number(row.generation_forecast_mw).toFixed(0)}
                  </td>
                  <td className="border px-3 py-2">
                    {row.eso_load_forecast_mw == null
                      ? "-"
                      : Number(row.eso_load_forecast_mw).toFixed(0)}
                  </td>
                  <td className="border px-3 py-2">
                    {row.real_system_margin_mw == null
                      ? "-"
                      : Number(row.real_system_margin_mw).toFixed(0)}
                  </td>
                  <td className="border px-3 py-2">
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
