import { createClient } from '@supabase/supabase-js'
import CaptureCharts from './CaptureCharts'

type PageProps = {
  searchParams?: {
    year?: string
    technology?: string
  }
}

const technologies = [
  { key: 'solar', label: 'Solar' },
  { key: 'wind', label: 'Wind' },
  { key: 'hydro', label: 'Hydro' },
  { key: 'nuclear', label: 'Nuclear' },
  { key: 'gas', label: 'Gas' },
  { key: 'biomass', label: 'Biomass' },
]

function formatPrice(value: any) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '-'
  return n.toFixed(2)
}

function getValue(row: any, technology: string, field: string) {
  return row?.[`${technology}_${field}`]
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

  const selectedTechnology = searchParams?.technology || 'solar'

  const selectedTechnologyLabel =
    technologies.find((t) => t.key === selectedTechnology)?.label || 'Solar'

  const { data: yearsData, error: yearsError } = await supabase
    .from('technology_capture_timeblock_v')
    .select('year')
    .order('year', { ascending: false })

  if (yearsError) {
    return <div className="p-6">Грешка: {yearsError.message}</div>
  }

  const years = Array.from(new Set((yearsData || []).map((row) => row.year)))

  const { data, error } = await supabase
    .from('technology_capture_timeblock_v')
    .select('*')
    .eq('year', selectedYear)
    .order('month', { ascending: true })

  if (error) {
    return <div className="p-6">Грешка: {error.message}</div>
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-bold">
            Technology Capture Analytics
          </h1>

          <p className="max-w-4xl text-gray-600">
            Анализ на исторически постигнатите претеглени цени по технологии,
            сезони и часови блокове. Capture Price показва реалната постигната
            цена на профила в €/MWh.
          </p>
        </div>

        <form className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-end">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Година
            </label>

            <select
              name="year"
              defaultValue={selectedYear}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Технология
            </label>

            <select
              name="technology"
              defaultValue={selectedTechnology}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {technologies.map((technology) => (
                <option key={technology.key} value={technology.key}>
                  {technology.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Покажи
          </button>
        </form>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
        <p className="mb-2">
          <strong>Capture Price</strong> е претеглената цена, която дадена
          технология е постигнала исторически.
        </p>

        <p className="mb-2">
          Формула: цена за часа × произведено количество за часа, сумирано за
          периода, разделено на общото количество енергия за същия период.
        </p>

        <p>
          <strong>Capture Rate %</strong> показва какъв дял е тази постигната
          цена спрямо средната цена на базовия товар за съответния месец.
        </p>
      </div>

      <CaptureCharts
        data={data || []}
        technology={selectedTechnology}
        technologyLabel={selectedTechnologyLabel}
      />

      <h2 className="mb-3 text-xl font-semibold">
        {selectedTechnologyLabel} Capture Price по часови блокове, €/MWh
      </h2>

      <div className="mb-8 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-gray-50">
            <tr>
              {[
                'Година',
                'Месец',
                'Сезон',
                'Market €/MWh',
                'Day Market €/MWh',
                'Evening Market €/MWh',
                'Night Market €/MWh',
                `${selectedTechnologyLabel} Total €/MWh`,
                `${selectedTechnologyLabel} Day €/MWh`,
                `${selectedTechnologyLabel} Evening €/MWh`,
                `${selectedTechnologyLabel} Night €/MWh`,
              ].map((header) => (
                <th
                  key={header}
                  className="whitespace-nowrap border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {(data || []).map((row) => (
              <tr key={`${row.year}-${row.month}`} className="hover:bg-gray-50">
                <td className="border border-gray-200 px-4 py-3">{row.year}</td>
                <td className="border border-gray-200 px-4 py-3">{row.month}</td>
                <td className="border border-gray-200 px-4 py-3">{row.season}</td>
                <td className="border border-gray-200 px-4 py-3">{formatPrice(row.avg_market_price)}</td>
                <td className="border border-gray-200 px-4 py-3">{formatPrice(row.day_market_price)}</td>
                <td className="border border-gray-200 px-4 py-3">{formatPrice(row.evening_market_price)}</td>
                <td className="border border-gray-200 px-4 py-3">{formatPrice(row.night_market_price)}</td>
                <td className="border border-gray-200 px-4 py-3">{formatPrice(getValue(row, selectedTechnology, 'capture_price'))}</td>
                <td className="border border-gray-200 px-4 py-3">{formatPrice(getValue(row, selectedTechnology, 'day_capture_price'))}</td>
                <td className="border border-gray-200 px-4 py-3">{formatPrice(getValue(row, selectedTechnology, 'evening_capture_price'))}</td>
                <td className="border border-gray-200 px-4 py-3">{formatPrice(getValue(row, selectedTechnology, 'night_capture_price'))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 text-xl font-semibold">
        {selectedTechnologyLabel} Capture Rate %, спрямо средната базова цена
      </h2>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-gray-50">
            <tr>
              {[
                'Година',
                'Месец',
                'Сезон',
                'Market €/MWh',
                'Capture Price €/MWh',
                'Capture Rate %',
              ].map((header) => (
                <th
                  key={header}
                  className="whitespace-nowrap border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {(data || []).map((row) => (
              <tr key={`rate-${row.year}-${row.month}`} className="hover:bg-gray-50">
                <td className="border border-gray-200 px-4 py-3">{row.year}</td>
                <td className="border border-gray-200 px-4 py-3">{row.month}</td>
                <td className="border border-gray-200 px-4 py-3">{row.season}</td>
                <td className="border border-gray-200 px-4 py-3">{formatPrice(row.avg_market_price)}</td>
                <td className="border border-gray-200 px-4 py-3">{formatPrice(getValue(row, selectedTechnology, 'capture_price'))}</td>
                <td className="border border-gray-200 px-4 py-3">{formatPrice(getValue(row, selectedTechnology, 'capture_rate_pct'))}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
