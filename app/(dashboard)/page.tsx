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
      <HomeAudiences />
      <HomeQuickActions />
      <HomeSteps />
    </div>
  );
}
