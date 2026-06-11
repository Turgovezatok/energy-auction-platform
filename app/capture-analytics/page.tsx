import { createClient } from '@supabase/supabase-js'

type PageProps = {
  searchParams?: {
    year?: string
  }
}

function formatPrice(value: any) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '-'
  return n.toFixed(2)
}

export default async function CaptureAnalyticsPage({ searchParams }: PageProps) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  const selectedYear = searchParams?.year
    ? Number(searchParams.year)
    : new Date().getFullYear()

  const { data: yearsData, error: yearsError } = await supabase
    .from('technology_capture_timeblock_v')
    .select('year')
    .order('year', { ascending: false })

  if (yearsError) {
    return <div className="p-6">Грешка: {yearsError.message}</div>
  }

  const years = Array.from(
    new Set((yearsData || []).map((row) => row.year))
  )

  const { data, error } = await supabase
    .from('technology_capture_timeblock_v')
    .select('*')
    .eq('year', selectedYear)
    .order('month', { ascending: false })

  if (error) {
    return <div className="p-6">Грешка: {error.message}</div>
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">
            Technology Capture Analytics
          </h1>

          <p className="text-gray-600">
            Исторически Capture Price по технологии, сезон и часови блок.
            Всички цени са в €/MWh.
          </p>
        </div>

        <form>
          <label className="block text-sm font-medium mb-1">
            Избери година
          </label>

          <select
            name="year"
            defaultValue={selectedYear}
            className="border rounded px-3 py-2"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="ml-2 rounded bg-black px-4 py-2 text-white"
          >
            Покажи
          </button>
        </form>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded border p-4">
          <div className="text-sm text-gray-500">Период</div>
          <div className="text-xl font-bold">{selectedYear}</div>
        </div>

        <div className="rounded border p-4">
          <div className="text-sm text-gray-500">Източник</div>
          <div className="text-xl font-bold">technology_capture_timeblock_v</div>
        </div>

        <div className="rounded border p-4">
          <div className="text-sm text-gray-500">Единица</div>
          <div className="text-xl font-bold">€/MWh</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-3 py-2">Година</th>
              <th className="border px-3 py-2">Месец</th>
              <th className="border px-3 py-2">Сезон</th>

              <th className="border px-3 py-2">Market €/MWh</th>
              <th className="border px-3 py-2">Day Market €/MWh</th>
              <th className="border px-3 py-2">Evening Market €/MWh</th>
              <th className="border px-3 py-2">Night Market €/MWh</th>

              <th className="border px-3 py-2">Solar €/MWh</th>
              <th className="border px-3 py-2">Wind €/MWh</th>
              <th className="border px-3 py-2">Hydro €/MWh</th>
              <th className="border px-3 py-2">Nuclear €/MWh</th>
              <th className="border px-3 py-2">Gas €/MWh</th>
              <th className="border px-3 py-2">Biomass €/MWh</th>

              <th className="border px-3 py-2">Solar Rate %</th>
              <th className="border px-3 py-2">Wind Rate %</th>
              <th className="border px-3 py-2">Hydro Rate %</th>
              <th className="border px-3 py-2">Nuclear Rate %</th>
            </tr>
          </thead>

          <tbody>
            {data?.map((row) => (
              <tr key={`${row.year}-${row.month}`}>
                <td className="border px-3 py-2">{row.year}</td>
                <td className="border px-3 py-2">{row.month}</td>
                <td className="border px-3 py-2">{row.season}</td>

                <td className="border px-3 py-2">{formatPrice(row.avg_market_price)}</td>
                <td className="border px-3 py-2">{formatPrice(row.day_market_price)}</td>
                <td className="border px-3 py-2">{formatPrice(row.evening_market_price)}</td>
                <td className="border px-3 py-2">{formatPrice(row.night_market_price)}</td>

                <td className="border px-3 py-2">{formatPrice(row.solar_capture_price)}</td>
                <td className="border px-3 py-2">{formatPrice(row.wind_capture_price)}</td>
                <td className="border px-3 py-2">{formatPrice(row.hydro_capture_price)}</td>
                <td className="border px-3 py-2">{formatPrice(row.nuclear_capture_price)}</td>
                <td className="border px-3 py-2">{formatPrice(row.gas_capture_price)}</td>
                <td className="border px-3 py-2">{formatPrice(row.biomass_capture_price)}</td>

                <td className="border px-3 py-2">{formatPrice(row.solar_capture_rate_pct)}%</td>
                <td className="border px-3 py-2">{formatPrice(row.wind_capture_rate_pct)}%</td>
                <td className="border px-3 py-2">{formatPrice(row.hydro_capture_rate_pct)}%</td>
                <td className="border px-3 py-2">{formatPrice(row.nuclear_capture_rate_pct)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
