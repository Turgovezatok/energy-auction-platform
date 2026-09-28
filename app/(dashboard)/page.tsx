import type { Metadata } from "next";
import HomeHero from "@/components/home/home-hero";
import HomeQuickActions from "@/components/home/home-quick-actions";
import HomeSteps from "@/components/home/home-steps";
import HomeAudiences from "@/components/home/home-audiences";

export const metadata: Metadata = {
  title: "energo.broker — Търгове за електроенергия",
  description:
    "Качете фактурата си, вижте очакваната capture цена и пуснете търг за електроенергия между доставчиците.",
};

export default function HomePage() {
  return (
    <div className="space-y-6">
      <HomeHero />
      <HomeQuickActions />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <HomeSteps />
        </div>
        <HomeAudiences />
      </div>
    </div>
  );
}
