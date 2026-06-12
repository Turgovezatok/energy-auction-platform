import { createClient } from '@supabase/supabase-js'
import DViewCharts from './DViewCharts'

type PageProps = {
  searchParams?: {
    year?: string
  }
}

export default async function DViewPage({ searchParams }: PageProps) {
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
    .from('dview_price_profile_v')
    .select('year')
    .order('year', { ascending: false })

  if (yearsError) {
    return <div className="p-6">Грешка: {yearsError.message}</div>
  }

  const years = Array.from(new Set((yearsData || []).map((row) => row.year)))

  const { data: profileData, error: profileError } = await supabase
    .from('dview_price_profile_v')
    .select('*')
    .eq('year', selectedYear)
    .order('month', { ascending: true })
    .order('hour', { ascending: true })

  const { data: durationData, error: durationError } = await supabase
    .from('dview_duration_curve_v')
    .select('*')
    .eq('year', selectedYear)
    .order('hour_rank', { ascending: true })

  if (profileError) {
    return <div className="p-6">Грешка DView Profile: {profileError.message}</div>
  }

  if (durationError) {
    return <div className="p-6">Грешка DView Duration Curve: {durationError.message}</div>
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-bold">
            DView / SAM-style Analytics
          </h1>

          <p className="max-w-4xl text-gray-600">
            SAM/NREL-style времеви анализ за борсови цени, дневни профили,
            месечни часови профили и price duration curve.
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

          <button
            type="submit"
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Покажи
          </button>
        </form>
      </div>

      <DViewCharts
        profileData={profileData || []}
        durationData={durationData || []}
        year={selectedYear}
      />
    </div>
  )
}
