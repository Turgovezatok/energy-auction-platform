'use client'

import { useEffect, useMemo, useState } from 'react'
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

function formatNumber(value: any) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '-'
  return n.toFixed(2)
}

function buildDailyProfile(profileData: ProfileRow[]) {
  const grouped = new Map<number, { sum: number; count: number }>()

  profileData.forEach((row) => {
    const hour = Number(row.hour)
    const price = Number(row.avg_price)

    if (!Number.isFinite(hour) || !Number.isFinite(price)) return

    const current = grouped.get(hour) || { sum: 0, count: 0 }
    current.sum += price
    current.count += 1
    grouped.set(hour, current)
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
  const grouped = new Map<
    number,
    {
      hour: number
      label: string
      jan: number | null
      apr: number | null
      jul: number | null
      oct: number | null
    }
  >()

  for (let hour = 0; hour <= 23; hour += 1) {
    grouped.set(hour, {
      hour,
      label: `${hour}:00`,
      jan: null,
      apr: null,
      jul: null,
      oct: null,
    })
  }

  profileData.forEach((row) => {
    const hour = Number(row.hour)
    const month = Number(row.month)
    const price = Number(row.avg_price)

    if (!Number.isFinite(hour) || !Number.isFinite(month) || !Number.isFinite(price)) {
      return
    }

    const current =
      grouped.get(hour) || {
        hour,
        label: `${hour}:00`,
        jan: null,
        apr: null,
        jul: null,
        oct: null,
      }

    if (month === 1) current.jan = price
    if (month === 4) current.apr = price
    if (month === 7) current.jul = price
    if (month === 10) current.oct = price

    grouped.set(hour, current)
  })

  return Array.from(grouped.values()).sort((a, b) => a.hour - b.hour)
}

export default function DViewCharts({
  profileData,
  durationData,
  year,
}: DViewChartsProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const dailyProfile = useMemo(
    () => buildDailyProfile(profileData || []),
    [profileData]
  )

  const monthlyProfile = useMemo(
    () => buildMonthlyProfile(profileData || []),
    [profileData]
  )

  if (!mounted) {
    return null
  }

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

        <div style={{ width: '100%', height: 360 }}>
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
                connectNulls
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

        <div style={{ width: '100%', height: 420 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyProfile}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip
                formatter={(value) => [`${formatNumber(value)} €/MWh`, 'Price']}
                labelFormatter={(label) => `Hour: ${label}`}
              />
              <Legend />
              <Line type="monotone" dataKey="jan" name="Jan" strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="apr" name="Apr" strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="jul" name="Jul" strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="oct" name="Oct" strokeWidth={2} dot={false} connectNulls />
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

        <div style={{ width: '100%', height: 360 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={durationData || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour_rank" />
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
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
