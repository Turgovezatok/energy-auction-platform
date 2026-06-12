import { createClient } from '@supabase/supabase-js'

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

export default async function StatisticsPage({ searchParams }: PageProps) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase env vars')
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  const selectedYear = searchParams?.year
    ? Number(searchParams.year)
    : new Date().getFullYear()

  const selectedTechnology = searchParams?.technology || 'solar'

  const selectedTechnologyLabel =
    technologies.find((t) => t.key === selectedTechnology)?.label || 'Solar'

  const { data: yearsData } = await supabase
    .from('technology_capture_timeblock_v')
    .select('year')
    .order('year', { ascending: false })

  const years = Array.from(new Set((yearsData || []).map((row) => row.year)))

  const { data, error } = await supabase
    .from('technology_capture_timeblock_v')
    .select('*')
    .eq('year', selectedYear)
    .order('month', { ascending: true })

  if (error) {
    return <div style={{ padding: 32 }}>Грешка: {error.message}</div>
  }

  return (
    <main style={{ padding: 32, maxWidth: 1400, margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ fontSize: 34, marginBottom: 8 }}>
        Статистики
      </h1>

      <p style={{ fontSize: 16, color: '#555', marginBottom: 28 }}>
        Публична справка за Capture Price и Capture Rate по технологии, години и часови блокове.
      </p>

      <form
        style={{
          display: 'flex',
          gap: 16,
          alignItems: 'end',
          flexWrap: 'wrap',
          padding: 20,
          border: '1px solid #ddd',
          borderRadius: 16,
          background: '#f8fafc',
          marginBottom: 32,
        }}
      >
        <div>
          <label style={{ display: 'block', fontWeight: 700, marginBottom: 8 }}>
            Година
          </label>
          <select
            name="year"
            defaultValue={selectedYear}
            style={{
              minWidth: 160,
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid #bbb',
              fontSize: 16,
              background: 'white',
            }}
          >
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 700, marginBottom: 8 }}>
            Технология
          </label>
          <select
            name="technology"
            defaultValue={selectedTechnology}
            style={{
              minWidth: 180,
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid #bbb',
              fontSize: 16,
              background: 'white',
            }}
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
          style={{
            padding: '13px 28px',
            borderRadius: 10,
            border: 'none',
            background: '#111827',
            color: 'white',
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Покажи
        </button>
      </form>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 24, marginBottom: 16 }}>
          {selectedTechnologyLabel} Capture Price по часови блокове, €/MWh
        </h2>

        <div style={{ overflowX: 'auto', border: '1px solid #ccc', borderRadius: 14 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead style={{ background: '#eef2f7' }}>
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
                  <th key={header} style={{ border: '1px solid #ccc', padding: 10, textAlign: 'left' }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {(data || []).map((row) => (
                <tr key={`${row.year}-${row.month}`}>
                  <td style={cell}>{row.year}</td>
                  <td style={cell}>{row.month}</td>
                  <td style={cell}>{row.season}</td>
                  <td style={cell}>{formatPrice(row.avg_market_price)}</td>
                  <td style={cell}>{formatPrice(row.day_market_price)}</td>
                  <td style={cell}>{formatPrice(row.evening_market_price)}</td>
                  <td style={cell}>{formatPrice(row.night_market_price)}</td>
                  <td style={cell}>{formatPrice(getValue(row, selectedTechnology, 'capture_price'))}</td>
                  <td style={cell}>{formatPrice(getValue(row, selectedTechnology, 'day_capture_price'))}</td>
                  <td style={cell}>{formatPrice(getValue(row, selectedTechnology, 'evening_capture_price'))}</td>
                  <td style={cell}>{formatPrice(getValue(row, selectedTechnology, 'night_capture_price'))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 24, marginBottom: 16 }}>
          {selectedTechnologyLabel} Capture Rate %, спрямо средната базова цена
        </h2>

        <div style={{ overflowX: 'auto', border: '1px solid #ccc', borderRadius: 14 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead style={{ background: '#eef2f7' }}>
              <tr>
                {[
                  'Година',
                  'Месец',
                  'Сезон',
                  'Market €/MWh',
                  'Capture Price €/MWh',
                  'Capture Rate %',
                ].map((header) => (
                  <th key={header} style={{ border: '1px solid #ccc', padding: 10, textAlign: 'left' }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {(data || []).map((row) => (
                <tr key={`rate-${row.year}-${row.month}`}>
                  <td style={cell}>{row.year}</td>
                  <td style={cell}>{row.month}</td>
                  <td style={cell}>{row.season}</td>
                  <td style={cell}>{formatPrice(row.avg_market_price)}</td>
                  <td style={cell}>{formatPrice(getValue(row, selectedTechnology, 'capture_price'))}</td>
                  <td style={cell}>{formatPrice(getValue(row, selectedTechnology, 'capture_rate_pct'))}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

const cell = {
  border: '1px solid #ccc',
  padding: 10,
  whiteSpace: 'nowrap' as const,
}
