export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeNumber(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;

  const cleaned = String(value).replace(/\s/g, "").replace(",", ".");
  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : null;
}

function extractInvoicePeriod(reportingPeriod: any): {
  month: number | null;
  year: number | null;
} {
  if (!reportingPeriod) return { month: null, year: null };

  const text = String(reportingPeriod);
  const regex = /(\d{1,2})[.\-/](\d{1,2})[.\-/](20\d{2})/g;

  let match: RegExpExecArray | null;
  let lastDate: RegExpExecArray | null = null;

  while ((match = regex.exec(text)) !== null) {
    lastDate = match;
  }

  if (lastDate) {
    return {
      month: Number(lastDate[2]),
      year: Number(lastDate[3]),
    };
  }

  const yearMatch = text.match(/20\d{2}/);
  const monthMatch = text.match(/\b(0?[1-9]|1[0-2])\b/);

  return {
    month: monthMatch ? Number(monthMatch[1]) : null,
    year: yearMatch ? Number(yearMatch[0]) : null,
  };
}

export async function POST(req: Request) {
  try {
    const { fileUrl, invoiceId } = await req.json();

    if (!fileUrl) {
      return NextResponse.json({ error: "Missing fileUrl" }, { status: 400 });
    }

    if (!invoiceId) {
      return NextResponse.json({ error: "Missing invoiceId" }, { status: 400 });
    }

    if (!process.env.PDF_SERVICE_URL) {
      throw new Error("Missing PDF_SERVICE_URL environment variable");
    }

    const pdfServiceResponse = await fetch(
      `${process.env.PDF_SERVICE_URL}/extract`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl }),
      }
    );

    const pdfResult = await pdfServiceResponse.json();

    if (!pdfServiceResponse.ok || !pdfResult.text) {
      throw new Error(pdfResult.detail || "PDF extraction failed");
    }

    const trimmedText = String(pdfResult.text).slice(0, 120000);

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

supplier_name = electricity supplier / invoice issuer / доставчик / издател на фактурата.
company_name = customer / recipient / получател / клиент.

Never use the supplier as company_name.

For paid energy fields:
- paid_energy_total = total value of active energy / electricity energy only, excluding VAT, network fees, excise and other charges.
- paid_energy_price = unit price of active energy / electricity energy.
- paid_energy_currency = currency shown next to the active energy amount or invoice currency, usually BGN or EUR.
- total_energy_kwh = total active energy quantity in kWh.
Use the master/summary row near the beginning of the invoice when available.
Look for phrases like:
"Активна енергия за периода",
"Активна енергия",
"Ел. енергия",
"Електрическа енергия".
Do not use total invoice amount, VAT amount, network fees, excise or final payable amount as paid_energy_total.`,
            },
            {
              role: "user",
              content: `Analyze this electricity invoice text:

${trimmedText}

Extract:
- invoice_number
- company_name
- EIK
- VAT_number
- client_number
- reporting_period
- supplier_name
- total_consumption_MWh
- energy_price_EUR_MWh
- paid_energy_total
- paid_energy_price
- paid_energy_currency
- total_energy_kwh

Also extract ALL sites / ALL ITN objects.

Return exactly this JSON structure:

{
  "invoice_number": null,
  "company_name": null,
  "EIK": null,
  "VAT_number": null,
  "client_number": null,
  "reporting_period": null,
  "supplier_name": null,
  "total_consumption_MWh": null,
  "energy_price_EUR_MWh": null,
  "paid_energy_total": null,
  "paid_energy_price": null,
  "paid_energy_currency": null,
  "total_energy_kwh": null,
  "sites": [
    {
      "itn": null,
      "meter_number": null,
      "address": null,
      "site_name": null,
      "distribution_operator": null,
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
}`,
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
      extracted = { raw_response: content };
    }

    const period = extractInvoicePeriod(extracted.reporting_period);

    const { data: uploadRecord, error: uploadError } = await supabase
      .from("invoice_uploads")
      .select("*")
      .eq("id", invoiceId)
      .single();

    if (uploadError || !uploadRecord) {
      return NextResponse.json({
        success: true,
        extracted,
        warning: "Invoice upload record not found",
      });
    }

    const { error: updateError } = await supabase
      .from("invoice_uploads")
      .update({
        supplier_name: extracted.supplier_name || null,
        invoice_number: extracted.invoice_number || null,
        customer_name: extracted.company_name || null,
        customer_eik: extracted.EIK || null,
        customer_vat: extracted.VAT_number || null,
        customer_number: extracted.client_number || null,
        reporting_period: extracted.reporting_period || null,

        invoice_period_month: period.month,
        invoice_period_year: period.year,

        total_consumption_mwh: normalizeNumber(extracted.total_consumption_MWh),
        energy_price_eur_mwh: normalizeNumber(extracted.energy_price_EUR_MWh),

        paid_energy_total: normalizeNumber(extracted.paid_energy_total),
        paid_energy_price: normalizeNumber(extracted.paid_energy_price),
        paid_energy_currency: extracted.paid_energy_currency || null,
        total_energy_kwh: normalizeNumber(extracted.total_energy_kwh),

        extracted_json: extracted,
        extraction_status: "completed",
      })
      .eq("id", invoiceId);

    if (updateError) {
      throw new Error(`Invoice update failed: ${updateError.message}`);
    }

    const { data: existingSites } = await supabase
      .from("invoice_sites")
      .select("id")
      .eq("invoice_id", invoiceId);

    if (existingSites && existingSites.length > 0) {
      const siteIds = existingSites.map((site: any) => site.id);

      await supabase
        .from("invoice_site_zones")
        .delete()
        .in("invoice_site_id", siteIds);

      await supabase.from("invoice_sites").delete().eq("invoice_id", invoiceId);
    }

    if (Array.isArray(extracted.sites)) {
      for (const extractedSite of extracted.sites) {
        const { data: site, error: siteError } = await supabase
          .from("invoice_sites")
          .insert({
            invoice_id: invoiceId,
            itn: extractedSite.itn || null,
            meter_number: extractedSite.meter_number || null,
            address: extractedSite.address || null,
            site_name: extractedSite.site_name || extracted.company_name || null,
            distribution_operator:
              extractedSite.distribution_operator || extracted.supplier_name || null,
            consumption_mwh: normalizeNumber(extractedSite.consumption_MWh),
            energy_price_eur_mwh: normalizeNumber(
              extractedSite.energy_price_EUR_MWh
            ),
          })
          .select()
          .single();

        if (siteError || !site) continue;

        if (Array.isArray(extractedSite.tariff_zones)) {
          for (const zone of extractedSite.tariff_zones) {
            await supabase.from("invoice_site_zones").insert({
              invoice_site_id: site.id,
              zone_name: zone.zone_name || null,
              zone_code: zone.tariff_code || null,
              consumption_kwh: normalizeNumber(
                zone.consumption_kwh ||
                  zone.consumption_KWh ||
                  zone.consumption_kWh ||
                  zone.kwh ||
                  zone.KWh ||
                  zone.consumption
              ),
            });
          }
        }
      }
    }

    const profileResponse = await fetch(
      new URL("/api/calculate-load-profile", req.url),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      }
    );

    let loadProfile = null;

    try {
      const profileResult = await profileResponse.json();

      if (profileResponse.ok && profileResult.success) {
        loadProfile = profileResult.profile;
      }
    } catch {
      loadProfile = null;
    }

    return NextResponse.json({
      success: true,
      extracted,
      invoicePeriod: period,
      loadProfile,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Extraction failed",
      },
      { status: 500 }
    );
  }
}
