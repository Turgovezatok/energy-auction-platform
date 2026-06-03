"use client";

import Link from "next/link";

export default function SubmitBidPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <main style={{ minHeight: "100vh", padding: 40, background: "#f3f6fb" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", fontFamily: "Arial" }}>
        <Link href={`/auction/${params.id}/bids`}>
          ← Назад към офертите
        </Link>

        <section
          style={{
            background: "white",
            padding: 32,
            borderRadius: 24,
            marginTop: 24,
            boxShadow: "0 14px 40px rgba(15,23,42,0.08)",
          }}
        >
          <h1>Подаване на оферта</h1>
          <p>
            Страницата е временно стабилизирана. Следващата стъпка е да върнем
            формата с трите варианта, валидност по дата и час и заключване след
            подаване.
          </p>
        </section>
      </div>
    </main>
  );
}
