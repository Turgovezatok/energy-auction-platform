import Link from "next/link";
import type { FC } from "react";
import IconFile from "@/components/icon/icon-file";
import IconListCheck from "@/components/icon/icon-list-check";
import IconBarChart from "@/components/icon/icon-bar-chart";
import IconSun from "@/components/icon/icon-sun";
import IconArrowLeft from "@/components/icon/icon-arrow-left";

type Action = {
  href: string;
  title: string;
  description: string;
  Icon: FC<{ className?: string }>;
  tone: string;
};

const ACTIONS: Action[] = [
  {
    href: "/consumer-onboarding",
    title: "Нов търг",
    description: "Качете PDF фактура и потвърдете данните.",
    Icon: IconFile,
    tone: "bg-primary/10 text-primary",
  },
  {
    href: "/my-auctions",
    title: "Моите търгове",
    description: "Статус и получени оферти.",
    Icon: IconListCheck,
    tone: "bg-success/10 text-success",
  },
  {
    href: "/forecast",
    title: "Ценова прогноза",
    description: "Прогноза за IBEX ден напред.",
    Icon: IconBarChart,
    tone: "bg-warning/10 text-warning",
  },
  {
    href: "/solar-capture",
    title: "Solar Capture",
    description: "Capture цени за ФЕЦ производители.",
    Icon: IconSun,
    tone: "bg-info/10 text-info",
  },
];

const HomeQuickActions = () => {
  return (
    <section aria-label="Бързи действия" className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {ACTIONS.map(({ href, title, description, Icon, tone }) => (
        <Link key={href} href={href} className="panel group flex flex-col gap-4 transition hover:shadow-lg">
          <span className={`grid h-11 w-11 place-content-center rounded-lg ${tone}`}>
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-dark dark:text-white-light">{title}</h2>
            <p className="mt-1 text-sm text-white-dark">{description}</p>
          </div>
          <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-primary">
            Отвори
            <IconArrowLeft className="h-4 w-4 transition group-hover:translate-x-1" />
          </span>
        </Link>
      ))}
    </section>
  );
};

export default HomeQuickActions;
