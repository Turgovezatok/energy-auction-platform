export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { fileUrl } = await req.json();

    if (!fileUrl) {
      return NextResponse.json({ error: "Missing fileUrl" }, { status: 400 });
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You extract structured electricity invoice data. Return ONLY valid JSON. Do not invent data. If a field is not visible in the invoice, return null. Use only values explicitly present in the PDF.",
          },
          {
            role: "user",
            content: `
Analyze this electricity invoice PDF:

${fileUrl}

IMPORTANT:
You must extract ALL sites / ALL ITN objects from ALL pages of the invoice.
Do not stop after the first site.
For every occurrence of "Обект ИТН №" create one object in "sites".
If the invoice has 10 ITN objects, return 10 site objects.
Do not invent data. Use only values explicitly visible in the invoice.

Extract:
- invoice_number
- invoice_date
- company_name
- EIK
- VAT_number
- client_number
- reporting_period
- supplier_name
- total_consumption_MWh
- energy_price_EUR_MWh

Return also:

"sites": [
  {
    "itn": "",
    "address": "",
    "consumption_MWh": 0,
    "energy_price_EUR_MWh": 0,
    "tariff_zones": [
      {
        "zone_name": "",
        "tariff_code": "",
        "consumption_kwh": 0
      }
    ]
  }
]

For each site:
- use only the data in the block under that specific "Обект ИТН №"
- extract its own consumption
- extract its own tariff zones
- do not mix data between sites

For Bulgarian invoices:
- "Д" means Day / Дневна
- "Н" means Night / Нощна
- "В" means Peak / Върхова, if present
- "НН" means low voltage, not a tariff zone

For tariff_zones:
- extract only real rows from the invoice
- do not use Zone A / Zone B unless these exact names appear
- if zones are not visible, return an empty array
`,
          },
        ],
        temperature: 0,
      }),
    });

    const result = await openaiResponse.json();
    const content = result.choices?.[0]?.message?.content;

    let extracted: any = null;

    try {
      extracted = JSON.parse(content);
    } catch {
      extracted = { raw_response: content };
    }

    const { data: uploadRecord } = await supabase
      .from("invoice_uploads")
      .select("*")
      .eq("file_url", fileUrl)
      .single();

    if (uploadRecord) {
      await supabase
        .from("invoice_uploads")
        .update({
          supplier_name: extracted.supplier_name || null,
          invoice_number: extracted.invoice_number || null,
          customer_name: extracted.company_name || null,
          customer_eik: extracted.EIK || null,
          customer_vat: extracted.VAT_number || null,
          customer_number: extracted.client_number || null,
          total_consumption_mwh: extracted.total_consumption_MWh || null,
          energy_price_eur_mwh: extracted.energy_price_EUR_MWh || null,
          extracted_json: extracted,
        })
        .eq("id", uploadRecord.id);

      if (Array.isArray(extracted.sites)) {
        for (const extractedSite of extracted.sites) {
          const { data: site } = await supabase
            .from("invoice_sites")
            .insert({
              invoice_id: uploadRecord.id,
              itn: extractedSite.itn || null,
              address: extractedSite.address || null,
              site_name: extracted.company_name || null,
              distribution_operator: extracted.supplier_name || null,
              consumption_mwh: extractedSite.consumption_MWh || null,
              energy_price_eur_mwh: extractedSite.energy_price_EUR_MWh || null,
            })
            .select()
            .single();

          if (site && Array.isArray(extractedSite.tariff_zones)) {
            for (const zone of extractedSite.tariff_zones) {
              await supabase.from("invoice_site_zones").insert({
                invoice_site_id: site.id,
                zone_name: zone.zone_name || null,
                zone_code: zone.tariff_code || null,
                consumption_kwh: zone.consumption_kwh || null,
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ extracted });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Extraction failed" },
      { status: 500 }
    );
  }
}
