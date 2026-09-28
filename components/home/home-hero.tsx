import Link from "next/link";
import IconBolt from "@/components/icon/icon-bolt";
import IconTrendingUp from "@/components/icon/icon-trending-up";

const HomeHero = () => {
  return (
    <section
      aria-labelledby="home-hero-title"
      className="panel relative overflow-hidden border-0 bg-gradient-to-r from-[#4361ee] to-[#160f6b] p-0 text-white"
    >
      <div className="flex flex-col gap-8 p-6 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            <IconBolt className="h-4 w-4" />
            Търгове за електроенергия
          </span>
          <h1 id="home-hero-title" className="mt-4 text-2xl font-bold leading-tight sm:text-4xl">
            По-добра цена за тока, чрез конкуренция между доставчиците
          </h1>
          <p className="mt-4 text-base text-white/80">
            Качете последната си фактура. Ще извлечем обектите и потреблението, ще изчислим очакваната
            capture цена по реалните борсови цени и ще пуснем търг.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/consumer-onboarding" className="btn border-0 bg-white text-primary shadow-none hover:bg-white/90">
              Качи фактура
            </Link>
            <Link href="/market-overview" className="btn btn-outline-primary border-white/60 text-white shadow-none hover:bg-white/10">
              Пазарен преглед
            </Link>
          </div>
        </div>

        <div className="hidden shrink-0 rounded-xl bg-white/10 p-6 backdrop-blur lg:block lg:w-72">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-content-center rounded-lg bg-white/20">
              <IconTrendingUp className="h-5 w-5" />
            </span>
            <p className="text-sm font-semibold">Capture преди търга</p>
          </div>
          <p className="mt-4 text-sm text-white/80">
            Преди да пуснете търга виждате очакваната цена, риска и препоръчания ценови модел, изчислени
            по 15-минутните цени от IBEX.
          </p>
        </div>
      </div>
    </section>
  );
};

export default HomeHero;
