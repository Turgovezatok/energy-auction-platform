"use client";

import { useState } from "react";

export default function ProducerOnboarding() {
  const [eik, setEik] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function searchProducer() {
    setLoading(true);

    const res = await fetch(
      `/api/producers/search?eik=${eik}`
    );

    const data = await res.json();

    setResults(data);

    setLoading(false);
  }

  return (
    <div className="p-10 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">
        Producer Onboarding
      </h1>

      <div className="flex gap-4 mb-8">
        <input
          className="border p-3 rounded w-full"
          placeholder="Въведи ЕИК"
          value={eik}
          onChange={(e) => setEik(e.target.value)}
        />

        <button
          onClick={searchProducer}
          className="bg-black text-white px-6 rounded"
        >
          Търси
        </button>
      </div>

      {loading && <p>Търсене...</p>}

      <div className="space-y-4">
        {results.map((row, index) => (
          <div
            key={index}
            className="border rounded p-4"
          >
            <h2 className="font-bold text-xl">
              {row["Производител"]}
            </h2>

            <p>
              <b>Обект:</b> {row["Обект"]}
            </p>

            <p>
              <b>Технология:</b>{" "}
              {row["Технология"]}
            </p>

            <p>
              <b>Инсталирана мощност:</b>{" "}
              {row["Инсталирана мощност"]}
            </p>

            <p>
              <b>Произведена енергия:</b>{" "}
              {row["Произв. енергия"]} MWh
            </p>

            <p>
              <b>Период:</b>{" "}
              {row["Период От"]} -{" "}
              {row["Период До"]}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
