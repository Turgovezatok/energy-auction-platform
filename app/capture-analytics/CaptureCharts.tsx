'use client'

import {
  Line,
  LineChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type CaptureChartsProps = {
  data: any[]
  technology: string
  technologyLabel: string
}

function getValue(row: any, technology: string, field: string) {
  const value = row?.[`${technology}_${field}`]
  const n = Number(value)
  return Number.isFinite(n) ? Number(n.toFixed(2)) : null
}

export default function CaptureCharts({
  data,
  technology,
  technologyLabel,
}: CaptureChartsProps) {
  const chartData = [...data]
    .sort((a, b) => Number(a.month) - Number(b.month))
    .map((row) => ({
      month: `${row.month}`,
      total: getValue(row, technology, 'capture_price'),
      day: getValue(row, technology, 'day_capture_price'),
      evening: getValue(row, technology, 'evening_capture_price'),
      night: getValue(row, technology, 'night_capture_price'),
      rate: getValue(row, technology, 'capture_rate_pct'),
    }))

  return (
    <div className="mb-8 grid grid-cols-1 gap-6">
      <div className="rounded border bg-white p-4">
        <h2 className="mb-2 text-xl font-semibold">
          {technologyLabel} Capture Price by Time Block
        </h2>

        <p className="mb-4 text-sm text-gray-600">
          Претеглена цена по часови блокове (ден, вечер и нощ) в €/MWh.
        </p>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />

              <Line
                type="monotone"
                dataKey="total"
                name="Total €/MWh"
              />

              <Line
                type="monotone"
                dataKey="day"
                name="Day €/MWh"
              />

              <Line
                type="monotone"
                dataKey="evening"
                name="Evening €/MWh"
              />

              <Line
                type="monotone"
                dataKey="night"
                name="Night €/MWh"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded border bg-white p-4">
        <h2 className="mb-2 text-xl font-semibold">
          {technologyLabel} Capture Rate %
        </h2>

        <p className="mb-4 text-sm text-gray-600">
          Capture Rate показва какъв процент от средната базова цена е постигнала технологията.
        </p>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />

              <Line
                type="monotone"
                dataKey="rate"
                name="Capture Rate %"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
