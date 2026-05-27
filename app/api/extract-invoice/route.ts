export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PDFParse } from "pdf-parse";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function extractPdfText(fileUrl: string): Promise<string> {
  const response = await fetch(fileUrl);

  async function extractPdfText(fileUrl: string): Promise<string> {
  const response = await fetch(fileUrl);

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Failed to download PDF. Status: ${response.status}. Response: ${errorText.slice(0, 200)}`
    );
  }

  const contentType = response.headers.get("content-type") || "";

  if (
    !contentType.includes("pdf") &&
    !contentType.includes("application/octet-stream")
  ) {
    const errorText = await response.text();

    throw new Error(
      `URL did not return PDF. Content-Type: ${contentType}. Response: ${errorText.slice(0, 200)}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();

  return result.text || "";
}

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();

  return result.text || "";
}

export async function POST(req: Request) {
  try {
    const { fileUrl } = await req.json();

    if (!fileUrl) {
      return NextResponse.json(
        { error: "Missing fileUrl" },
        { status: 400 }
      );
    }

    const pdfText = await extractPdfText(fileUrl);
    const trimmedText = pdfText.slice(0, 120000);

    if (!trimmedText.trim()) {
      throw new Error("Could not extract text from PDF");
    }

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
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
              content: `You extract structured electricity invoice data.

Return ONLY valid JSON.
Do not invent data.
If a field is not visible in the invoice, return null.
Use only values explicitly present in the invoice text.

Very important:
supplier_name = the electricity supplier / invoice issuer / доставчик / издател на фактурата.
company_name = the customer / recipient / получател на доставката / клиент.

Never use the supplier as company_name.
If the invoice has both supplier and recipient, company_name must be the recipient/customer.`,
            },
            {
              role: "user",
              content: `Analyze this electricity invoice text:

${trimmedText}

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

Return exactly this JSON structure:

{
  "invoice_number": null,
  "invoice_date": null,
  "company_name": null,
  "EIK": null,
  "VAT_number": null,
  "client_number": null,
  "reporting_period": null,
  "supplier_name": null,
  "total_consumption_MWh": null,
  "energy_price_EUR_MWh": null,
  "sites": [
    {
      "itn": null,
      "address": null,
      "consumption_MWh": null,
      "energy_price_EUR_MWh": null,
      "tariff_zones": [
        {
          "zone_name": null,
          "tariff_code": null,
          "consumption_kwh": null
        }
      ]
    }
  ]
}

For each site:
- use only the data in the block under that specific "Обект ИТН №"
- extract its own consumption
- extract its own tariff zones
- do not mix data between sites

For Bulgarian invoices:
- "Д" means Day / Дневна
- "Н" means Night / Нощна
- "В" means Peak / Върхова
- "НН" means low voltage, not tariff zone

EVN / ЕВН:
- Use "Начисл. кВтч"
- Ignore "Разлика"

TOKI / ТОКИ:
- Use column "Общо"
- Ignore "Разлика кВтч"

If zones are not visible return empty array.`,
            },
          ],
          temperature: 0,
        }),
      }
    );

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();

      throw new Error(`OpenAI extraction failed: ${errorText}`);
    }

    const result = await openaiResponse.json();

    const content = result.choices?.[0]?.message?.content;

    let extracted: any;

    try {
      extracted = JSON.parse(content || "{}");
    } catch {
      extracted = {
        raw_response: content,
      };
    }

    const { data: uploadRecord } = await supabase
      .from("invoice_uploads")
      .select("*")
      .eq("file_url", fileUrl)
      .single();

    if (!uploadRecord) {
      return NextResponse.json({
        extracted,
        warning: "Invoice upload record not found",
      });
    }

    await supabase
      .from("invoice_uploads")
      .update({
        supplier_name: extracted.supplier_name || null,
        invoice_number: extracted.invoice_number || null,
        customer_name: extracted.company_name || null,
        customer_eik: extracted.EIK || null,
        customer_vat: extracted.VAT_number || null,
        customer_number: extracted.client_number || null,
        total_consumption_mwh:
          extracted.total_consumption_MWh || null,
        energy_price_eur_mwh:
          extracted.energy_price_EUR_MWh || null,
        extracted_json: extracted,
        extraction_status: "completed",
      })
      .eq("id", uploadRecord.id);

    const { data: existingSites } = await supabase
      .from("invoice_sites")
      .select("id")
      .eq("invoice_id", uploadRecord.id);

    if (existingSites && existingSites.length > 0) {
      const siteIds = existingSites.map(
        (site: any) => site.id
      );

      await supabase
        .from("invoice_site_zones")
        .delete()
        .in("invoice_site_id", siteIds);

      await supabase
        .from("invoice_sites")
        .delete()
        .eq("invoice_id", uploadRecord.id);
    }

    if (Array.isArray(extracted.sites)) {
      for (const extractedSite of extracted.sites) {
        const { data: site } = await supabase
          .from("invoice_sites")
          .insert({
            invoice_id: uploadRecord.id,
            itn: extractedSite.itn || null,
            address: extractedSite.address || null,
            site_name: extracted.company_name || null,
            distribution_operator:
              extracted.supplier_name || null,
            consumption_mwh:
              extractedSite.consumption_MWh || null,
            energy_price_eur_mwh:
              extractedSite.energy_price_EUR_MWh || null,
          })
          .select()
          .single();

        if (
          site &&
          Array.isArray(extractedSite.tariff_zones)
        ) {
          for (const zone of extractedSite.tariff_zones) {
            await supabase
              .from("invoice_site_zones")
              .insert({
                invoice_site_id: site.id,
                zone_name: zone.zone_name || null,
                zone_code: zone.tariff_code || null,
                consumption_kwh:
                  zone.consumption_kwh ||
                  zone.consumption ||
                  null,
              });
          }
        }
      }
    }

    return NextResponse.json({ extracted });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || "Extraction failed",
      },
      {
        status: 500,
      }
    );
  }
}
