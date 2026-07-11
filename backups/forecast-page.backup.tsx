import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-4xl font-bold text-slate-900">
          EnergyBid
        </h1>

        <p className="mt-4 text-lg text-slate-600">
          Платформа за търгове, прогнози и анализ на електроенергийния пазар.
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/forecast"
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Виж прогнозата
          </Link>

          <Link
            href="/capture-analytics"
            className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800"
          >
            Capture Analytics
          </Link>
        </div>
      </div>
    </main>
  );
}
