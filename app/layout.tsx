import ProviderComponent from "@/components/layouts/provider-component";
import "@/styles/tailwind.css";
import "@/styles/animate.css";

export const metadata = {
  title: "energo.broker",
  description: "Energy auction platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bg">
      <body>
        <ProviderComponent>{children}</ProviderComponent>
      </body>
    </html>
  );
}