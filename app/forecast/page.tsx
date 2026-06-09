"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function ForecastChart({ data }: any) {
  const chartData =
    data?.map((row: any) => ({
      time: new Date(row.timestamp_utc).toLocaleString("bg-BG", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
      }),
      price: row.forecast_price_eur_mwh,
    })) || [];

  return (
    <div className="bg-white rounded-xl p-4 shadow">
      <div style={{ width: "100%", height: 500 }}>
        <ResponsiveContainer>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis
              dataKey="time"
              angle={-45}
              textAnchor="end"
              height={80}
            />

            <YAxis />

            <Tooltip />

            <Line
              type="monotone"
              dataKey="price"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
