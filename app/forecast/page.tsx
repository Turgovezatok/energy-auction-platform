import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function ForecastPage() {
  const { data, error } = await supabase
    .from("price_forecast_results")
    .select(
      "timestamp_utc, forecast_price_eur_mwh, generation_forecast_mw, eso_load_forecast_mw, real_system_margin_mw, real_system_ratio"
    )
    .order("timestamp_utc", { ascending: true })
    .limit(72);

  if (error) {
    return <div className="p-6">Грешка: {error.message}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Прогноза за цена на електроенергия</h1>

      <p className="mt-2 mb-6 text-gray-600">
        Последни прогнозни стойности от EnergyBid Forecast Engine.
      </p>

      <div className="overflow-x-auto">
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
            {data?.map((row) => (
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
  );
}
