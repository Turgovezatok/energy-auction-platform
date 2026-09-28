const STEPS = [
  {
    title: "Качвате фактура",
    description: "PDF фактура от текущия доставчик. Товаров профил (xls/csv) е по избор.",
  },
  {
    title: "Извличаме данните",
    description: "Фирма, ЕИК, обекти (ИТН), тарифи и месечно потребление, автоматично.",
  },
  {
    title: "Изчисляваме capture",
    description: "Очаквана цена, риск и препоръчан модел по реалните борсови цени.",
  },
  {
    title: "Пускате търг",
    description: "След потвърден имейл доставчиците подават оферти и избирате най-добрата.",
  },
];

const HomeSteps = () => {
  return (
    <section aria-labelledby="home-steps-title" className="panel h-full">
      <h2 id="home-steps-title" className="text-lg font-semibold text-dark dark:text-white-light">
        Как работи
      </h2>
      <ol className="mt-6 space-y-5">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-4">
            <span className="grid h-9 w-9 shrink-0 place-content-center rounded-full bg-primary text-sm font-bold text-white">
              {index + 1}
            </span>
            <div>
              <h3 className="font-semibold text-dark dark:text-white-light">{step.title}</h3>
              <p className="mt-1 text-sm text-white-dark">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
};

export default HomeSteps;
