export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { extractInvoiceFromPdf, InvoiceServiceBusyError } from "@/lib/invoice-extraction";

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

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const { fileUrl, invoiceId } = await req.json();

    if (!fileUrl) {
      return NextResponse.json({ error: "Missing fileUrl" }, { status: 400 });
    }

    if (!invoiceId) {
      return NextResponse.json({ error: "Missing invoiceId" }, { status: 400 });
    }

    const extracted: any = await extractInvoiceFromPdf(fileUrl);

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
    const busy = error instanceof InvoiceServiceBusyError;
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Extraction failed",
      },
      { status: busy ? 429 : 500 }
    );
  }
}
