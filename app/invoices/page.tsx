"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    loadInvoices();
  }, []);

  async function loadInvoices() {
    const { data } = await supabase
      .from("invoice_uploads")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    setInvoices(data || []);
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">
        Фактури
      </h1>

      <div className="grid gap-4">
        {invoices.map((invoice) => (
          <div
            key={invoice.id}
            className="border rounded-xl p-4 bg-white shadow"
          >
            <div className="font-semibold text-lg">
              {invoice.customer_name ||
                "Неизвестен клиент"}
            </div>

            <div className="text-sm text-gray-500">
              Фактура:
              {" "}
              {invoice.invoice_number ||
                "-"}
            </div>

            <div className="text-sm text-gray-500">
              Доставчик:
              {" "}
              {invoice.supplier_name ||
                "-"}
            </div>

            <div className="text-sm text-gray-500">
              Потребление:
              {" "}
              {invoice.total_consumption_mwh ||
                "-"}{" "}
              MWh
            </div>

            <div className="mt-4 flex gap-2">
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg">
                Преглед
              </button>

              <button className="bg-green-600 text-white px-4 py-2 rounded-lg">
                Създай търг
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
