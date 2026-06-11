"use client";

export default function ForecastPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">
          EnergyBid Forecast
        </h1>

        <p className="mt-4 text-slate-600">
          Forecast page reset successful.
        </p>

        <div className="mt-6 rounded-lg border p-4">
          <p>
            Страницата е временно възстановена. След като build-ът мине успешно,
            ще върнем пълната версия с графиката и данните от Supabase.
          </p>
        </div>
      </div>
    </main>
  );
}
