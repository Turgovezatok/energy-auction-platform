'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

type ProfileRow = {
  year: number
  month: number
  hour: number
  avg_price: number
  avg_solar_mwh: number
  avg_wind_mwh: number
  avg_load: number
  avg_residual_load: number
  avg_cross_border_trade: number
}

type DurationRow = {
  year: number
  hour_rank: number
  dayahead_price: number
}

type DViewChartsProps = {
  profileData: ProfileRow[]
  durationData: DurationRow[]
  year: number
}

const monthNames: Record<number, string> = {
  1: 'Jan',
  2: 'Feb',
  3: 'Mar',
  4: 'Apr',
  5: 'May',
  6: 'Jun',
  7: 'Jul',
  8: 'Aug',
  9: 'Sep',
  10: 'Oct',
  11: 'Nov',
  12: 'Dec',
}

function formatNumber(value: any) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '-'
  return n.toFixed(2)
}

function buildDailyProfile(profileData: ProfileRow[]) {
  const grouped = new Map<number, { sum: number; count: number }>()

  profileData.forEach((row) => {
    const current = grouped.get(row.hour) || { sum: 0, count: 0 }
    current.sum += Number(row.avg_price || 0)
    current.count += 1
    grouped.set(row.hour, current)
  })

  return Array.from(grouped.entries())
    .map(([hour, value]) => ({
      hour,
      label: `${hour}:00`,
      avg_price: value.count ? value.sum / value.count : null,
    }))
    .sort((a, b) => a.hour - b.hour)
}

function buildMonthlyProfile(profileData: ProfileRow[]) {
  return profileData.map((row) => ({
    ...row,
    month_label: monthNames[row.month] || String(row.month),
    hour_label: `${row.hour}:00`,
    avg_price: Number(row.avg_price || 0),
  }))
}

export default function DViewCharts({
  profileData,
  durationData,
  year,
}: DViewChartsProps) {
  const dailyProfile = buildDailyProfile(profileData)
  const monthlyProfile = buildMonthlyProfile(profileData)

  return (
    <div className="mb-8 space-y-8">
      <div>
        <h2 className="mb-2 text-xl font-semibold">
          DView / SAM-style Time Series Viewer
        </h2>

        <p className="mb-4 text-sm text-gray-600">
          Тези графики пресъздават логиката на SAM/NREL DView — профил на цените
          по часове, месечни профили и duration curve за оценка на пазарни и
          батерийни възможности.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-1 text-lg font-semibold">
          Average Daily Price Profile — {year}
        </h3>

        <p className="mb-4 text-sm text-gray-600">
          Средна цена по час за избраната година. Полезно за анализ на соларна
          канибализация, вечерни пикове и батерийна стратегия.
        </p>

        <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyProfile}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip
                formatter={(value) => [`${formatNumber(value)} €/MWh`, 'Price']}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="avg_price"
                name="Average price"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-1 text-lg font-semibold">
          Monthly Hourly Price Profiles — {year}
        </h3>

        <p className="mb-4 text-sm text-gray-600">
          Средна цена по час и месец. Това показва сезонното изместване на
          ниски дневни цени и високи вечерни цени.
        </p>

        <div className="h-[420px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyProfile}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour_label" />
              <YAxis />
              <Tooltip
                formatter={(value) => [`${formatNumber(value)} €/MWh`, 'Price']}
                labelFormatter={(label) => `Hour: ${label}`}
              />
              <Legend />
              {[1, 4, 7, 10].map((month) => (
                <Line
                  key={month}
                  type="monotone"
                  dataKey={(row: any) =>
                    row.month === month ? row.avg_price : null
                  }
                  name={monthNames[month]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-1 text-lg font-semibold">
          Price Duration Curve — {year}
        </h3>

        <p className="mb-4 text-sm text-gray-600">
          Всички часове са подредени от най-висока към най-ниска цена. Това
          показва колко често има екстремно високи, ниски или отрицателни цени.
        </p>

        <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={durationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="hour_rank"
                tickFormatter={(value) => String(value)}
              />
              <YAxis />
              <Tooltip
                formatter={(value) => [`${formatNumber(value)} €/MWh`, 'Price']}
                labelFormatter={(label) => `Hour rank: ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="dayahead_price"
                name="Day-ahead price"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
