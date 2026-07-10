export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">
        Dashboard
      </h1>

      <p className="text-gray-500 mb-8">
        Добре дошли в energo.broker платформата.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="panel">
          <h3 className="text-lg font-semibold">
            Активни търгове
          </h3>

          <p className="text-4xl font-bold text-success mt-8">
            12
          </p>
        </div>

        <div className="panel">
          <h3 className="text-lg font-semibold">
            Получени оферти
          </h3>

          <p className="text-4xl font-bold text-primary mt-8">
            37
          </p>
        </div>

        <div className="panel">
          <h3 className="text-lg font-semibold">
            Средна цена
          </h3>

          <p className="text-4xl font-bold text-warning mt-8">
            152 лв
          </p>
        </div>

      </div>
    </div>
  );
}