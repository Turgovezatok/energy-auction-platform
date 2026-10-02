import Link from "next/link";
import type { FC } from "react";
import IconFile from "@/components/icon/icon-file";
import IconBolt from "@/components/icon/icon-bolt";
import IconSun from "@/components/icon/icon-sun";
import IconTrendingUp from "@/components/icon/icon-trending-up";

type Audience = {
  title: string;
  description: string;
  href: string | null;
  Icon: FC<{ className?: string }>;
  tone: string;
};

const AUDIENCES: Audience[] = [
  {
    title: "За потребители без централа",
    description: "Качете фактурата си и пуснете търг между доставчиците за по-ниска цена.",
    href: "/consumer-onboarding",
    Icon: IconFile,
    tone: "bg-primary/10 text-primary",
  },
  {
    title: "За потребител с централа",
    description: "Собствено производство и потребление: оптимизирайте покупката и излишъка.",
    href: null,
    Icon: IconBolt,
    tone: "bg-secondary/10 text-secondary",
  },
  {
    title: "За производители",
    description: "ФЕЦ и други централи, които търсят купувач и capture цена за енергията си.",
    href: "/producer-onboarding",
    Icon: IconSun,
    tone: "bg-warning/10 text-warning",
  },
  {
    title: "За търговци",
    description: "Достъп до търговете, профилите на товара и пазарните прогнози.",
    href: null,
    Icon: IconTrendingUp,
    tone: "bg-success/10 text-success",
  },
];

const HomeAudiences = () => {
  return (
    <section aria-labelledby="home-audiences-title">
      <h2 id="home-audiences-title" className="mb-4 text-lg font-semibold text-dark dark:text-white-light">
        Изберете вашия профил
      </h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {AUDIENCES.map(({ title, description, href, Icon, tone }) => (
          <div key={title} className="panel flex flex-col gap-4">
            <span className={`grid h-11 w-11 place-content-center rounded-lg ${tone}`}>
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-dark dark:text-white-light">{title}</h3>
              <p className="mt-1 text-sm text-white-dark">{description}</p>
            </div>
            {href ? (
              <Link href={href} className="btn btn-primary mt-auto w-full">
                Започни
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="btn btn-outline-dark mt-auto w-full cursor-not-allowed opacity-60"
              >
                Скоро
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default HomeAudiences;
