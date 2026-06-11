import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
  )
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default async function SolarCapturePage() {
  const { data, error } = await supabase
    .from('solar_capture_monthly_v')
    .select('*')
    .order('year', { ascending: false })
    .order('month', { ascending: false })

  if (error) {
    return <div className="p-6">Грешка: {error.message}</div>
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        Solar Capture Analytics
      </h1>

      <p className="mb-6 text-gray-600">
        Месечна средна борсова цена, соларно-претеглена цена и соларен дискаунт.
      </p>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-3 py-2">Година</th>
              <th className="border px-3 py-2">Месец</th>
              <th className="border px-3 py-2">Средна цена €/MWh</th>
              <th className="border px-3 py-2">Соларна цена €/MWh</th>
              <th className="border px-3 py-2">Дискаунт €/MWh</th>
              <th className="border px-3 py-2">Дискаунт %</th>
              <th className="border px-3 py-2">Соларна генерация MWh</th>
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
                  {Number(row.solar_discount_eur).toFixed(2)}
                </td>
                <td className="border px-3 py-2">
                  {Number(row.solar_discount_pct).toFixed(1)}%
                </td>
                <td className="border px-3 py-2">
                  {Number(row.total_solar_mwh).toLocaleString('bg-BG')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
