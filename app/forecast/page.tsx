cat > app/forecast/page.tsx <<'EOF'
"use client";

export default function ForecastPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">
          EnergyBid Forecast
        </h1>
        <p className="mt-2 text-slate-600">
          Forecast page reset successful.
        </p>
      </div>
    </main>
  );
}
EOF
