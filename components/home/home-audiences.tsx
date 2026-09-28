import Link from "next/link";

const AUDIENCES = [
  {
    title: "Потребители",
    description: "Фирми на свободния пазар, които искат по-ниска цена за електроенергия.",
    href: "/consumer-onboarding",
    cta: "Започни като потребител",
    button: "btn-primary",
  },
  {
    title: "Производители",
    description: "ФЕЦ и други производители, които търсят купувач за енергията си.",
    href: "/producer-onboarding",
    cta: "Започни като производител",
    button: "btn-outline-primary",
  },
];

const HomeAudiences = () => {
  return (
    <section aria-labelledby="home-audiences-title" className="panel h-full">
      <h2 id="home-audiences-title" className="text-lg font-semibold text-dark dark:text-white-light">
        За кого е
      </h2>
      <div className="mt-6 space-y-5">
        {AUDIENCES.map((audience) => (
          <div key={audience.title} className="rounded-lg border border-white-light p-4 dark:border-[#1b2e4b]">
            <h3 className="font-semibold text-dark dark:text-white-light">{audience.title}</h3>
            <p className="mt-1 text-sm text-white-dark">{audience.description}</p>
            <Link href={audience.href} className={`btn ${audience.button} btn-sm mt-4 w-full`}>
              {audience.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HomeAudiences;
