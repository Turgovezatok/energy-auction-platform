import { createClient } from '@supabase/supabase-js'

export default async function CaptureAnalyticsPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  const { data, error } = await supabase
    .from('technology_capture_history_v')
    .select('*')
    .order('year', { ascending: false })
    .order('month', { ascending: false })

  if (error) {
    return <div className="p-6">Грешка: {error.message}</div>
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        Technology Capture Analytics
      </h1>

      <p className="mb-6 text-gray-600">
        Исторически Capture Price по технологии спрямо средната борсова цена.
      </p>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-3 py-2">Година</th>
              <th className="border px-3 py-2">Месец</th>
              <th className="border px-3 py-2">Market €/MWh</th>
              <th className="border px-3 py-2">Solar</th>
              <th className="border px-3 py-2">Wind</th>
              <th className="border px-3 py-2">Hydro</th>
              <th className="border px-3 py-2">Nuclear</th>
              <th className="border px-3 py-2">Gas</th>
              <th className="border px-3 py-2">Biomass</th>
            </tr>
          </thead>

          <tbody>
            {data?.map((row) => (
              <tr key={`${row.year}-${row.month}`}>
                <td className="border px-3 py-2">{row.year}</td>
                <td className="border px-3 py-2">{row.month}</td>

                <td className="border px-3 py-2">
                  {Number(row.avg_market_price).toFixed(2)}
                </td>

                <td className="border px-3 py-2">
                  {Number(row.solar_capture_price).toFixed(2)}
                </td>

                <td className="border px-3 py-2">
                  {Number(row.wind_capture_price).toFixed(2)}
                </td>

                <td className="border px-3 py-2">
                  {Number(row.hydro_capture_price).toFixed(2)}
                </td>

                <td className="border px-3 py-2">
                  {Number(row.nuclear_capture_price).toFixed(2)}
                </td>

                <td className="border px-3 py-2">
                  {Number(row.gas_capture_price).toFixed(2)}
                </td>

                <td className="border px-3 py-2">
                  {Number(row.biomass_capture_price).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
