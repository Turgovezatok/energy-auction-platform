import { createClient } from '@supabase/supabase-js'

type PageProps = {
  searchParams?: {
    year?: string
    technology?: string
  }
}

const technologies = [
  { key: 'solar', label: 'Solar PV' },
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

function formatMWh(value: any) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '-'
  return n.toLocaleString('en-US', {
    maximumFractionDigits: 1,
  })
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
    technologies.find((t) => t.key === selectedTechnology)?.label || 'Solar PV'

  const { data: yearsData } = await supabase
    .from('technology_capture_timeblock_clean_v')
    .select('year')
    .order('year', { ascending: false })

  const years = Array.from(new Set((yearsData || []).map((row) => row.year)))

  const { data, error } = await supabase
    .from('technology_capture_timeblock_clean_v')
    .select('*')
    .eq('year', selectedYear)
    .order('month', { ascending: true })

  if (error) {
    return <div style={{ padding: 32 }}>Грешка: {error.message}</div>
  }

  return (
    <main style={page}>
      <h1 style={title}>Статистики</h1>

      <p style={subtitle}>
        Публична справка за цена на базов товар, цена на соларна енергия,
        capture rate и стойност на енергия от батерия.
      </p>

      <form style={filterBar}>
        <div>
          <label style={label}>Година</label>
          <select name="year" defaultValue={selectedYear} style={select}>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={label}>Технология</label>
          <select
            name="technology"
            defaultValue={selectedTechnology}
            style={select}
          >
            {technologies.map((technology) => (
              <option key={technology.key} value={technology.key}>
                {technology.label}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" style={button}>
          Покажи
        </button>
      </form>

      <section style={{ marginBottom: 40 }}>
        <h2 style={sectionTitle}>
          {selectedTechnologyLabel} — основна справка
        </h2>

        <div style={tableWrap}>
          <table style={table}>
            <thead style={thead}>
              <tr>
                {[
                  'Година',
                  'Месец',
                  'Сезон',
                  'Цена базов товар €/MWh',
                  'Цена на соларна енергия €/MWh',
                  'Capture Rate %',
                  'Цена за енергия от батерия €/MWh',
                  'Соларна енергия MWh',
                  'Енергия от батерия MWh',
                ].map((header) => (
                  <th key={header} style={th}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {(data || []).map((row) => {
                const capturePrice = getValue(
                  row,
                  selectedTechnology,
                  'capture_price'
                )

                const captureRate =
                  Number(row.avg_market_price) > 0
                    ? (Number(capturePrice) / Number(row.avg_market_price)) * 100
                    : null

                return (
                  <tr key={`${row.year}-${row.month}`}>
                    <td style={td}>{row.year}</td>
                    <td style={td}>{row.month}</td>
                    <td style={td}>{row.season}</td>
                    <td style={td}>{formatPrice(row.avg_market_price)}</td>
                    <td style={td}>{formatPrice(capturePrice)}</td>
                    <td style={td}>
                      {Number.isFinite(captureRate)
                        ? `${formatPrice(captureRate)}%`
                        : '-'}
                    </td>
                    <td style={td}>
                      {selectedTechnology === 'solar'
                        ? formatPrice(row.solar_storage_capture_price)
                        : '-'}
                    </td>
                    <td style={td}>
                      {selectedTechnology === 'solar'
                        ? formatMWh(row.solar_pv_mwh)
                        : formatMWh(getValue(row, selectedTechnology, 'mwh'))}
                    </td>
                    <td style={td}>
                      {selectedTechnology === 'solar'
                        ? formatMWh(row.solar_storage_mwh)
                        : '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

const page: React.CSSProperties = {
  padding: 32,
  maxWidth: 1400,
  margin: '0 auto',
  fontFamily: 'Arial, sans-serif',
}

const title: React.CSSProperties = {
  fontSize: 38,
  marginBottom: 8,
}

const subtitle: React.CSSProperties = {
  fontSize: 17,
  color: '#555',
  marginBottom: 28,
}

const filterBar: React.CSSProperties = {
  display: 'flex',
  gap: 18,
  alignItems: 'end',
  flexWrap: 'wrap',
  padding: 22,
  border: '1px solid #ddd',
  borderRadius: 18,
  background: '#f8fafc',
  marginBottom: 34,
}

const label: React.CSSProperties = {
  display: 'block',
  fontWeight: 800,
  marginBottom: 8,
  fontSize: 15,
}

const select: React.CSSProperties = {
  minWidth: 190,
  padding: '14px 16px',
  borderRadius: 12,
  border: '1px solid #bbb',
  fontSize: 17,
  background: 'white',
}

const button: React.CSSProperties = {
  padding: '15px 32px',
  borderRadius: 12,
  border: 'none',
  background: '#111827',
  color: 'white',
  fontSize: 17,
  fontWeight: 800,
  cursor: 'pointer',
}

const sectionTitle: React.CSSProperties = {
  fontSize: 25,
  marginBottom: 16,
}

const tableWrap: React.CSSProperties = {
  overflowX: 'auto',
  border: '1px solid #cbd5e1',
  borderRadius: 16,
  background: 'white',
}

const table: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 14,
}

const thead: React.CSSProperties = {
  background: '#e5eef8',
}

const th: React.CSSProperties = {
  border: '1px solid #cbd5e1',
  padding: 12,
  textAlign: 'left',
  whiteSpace: 'nowrap',
}

const td: React.CSSProperties = {
  border: '1px solid #cbd5e1',
  padding: 12,
  whiteSpace: 'nowrap',
}
