export const runtime = "nodejs";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  captureFromMonthlySummary,
  computeCapture,
  fetchExchangePrices,
  flatShape,
  parseLoadProfile,
  tariffShape,
  type CaptureResult,
  type CaptureSource,
  type LoadShape,
} from "@/lib/market-capture";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const WINDOW_DAYS = 365;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Липсва конфигурация на базата данни.");
  return createClient(url, key, { auth: { persistSession: false } });
}

function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const invoiceId = String(form.get("invoiceId") || "");
    const worksSaturday = form.get("worksSaturday") !== "false";
    const worksSunday = form.get("worksSunday") !== "false";
    const file = form.get("file");

    if (!/^[0-9a-f-]{36}$/i.test(invoiceId)) return fail("Невалидна фактура.", 400);

    const supabase = getSupabaseAdmin();

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoice_uploads")
      .select("id, energy_price_eur_mwh")
      .eq("id", invoiceId)
      .single();
    if (invoiceError || !invoice) return fail("Фактурата не е намерена.", 404);

    const { data: profile } = await supabase
      .from("invoice_load_profiles")
      .select("day_share, night_share, profile_quality")
      .eq("invoice_id", invoiceId)
      .maybeSingle();

    const dayShare = Number(profile?.day_share || 0);
    const nightShare = Number(profile?.night_share || 0);
    const hasTariffSplit = dayShare + nightShare > 0.5;

    let shape: LoadShape = flatShape();
    let source: CaptureSource = "flat";
    let profileNote: string | null = null;

    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_FILE_BYTES) return fail("Файлът е по-голям от 10 MB.", 413);
      try {
        const parsed = parseLoadProfile(Buffer.from(await file.arrayBuffer()), file.name);
        if (parsed) {
          shape = parsed.shape;
          source = "profile-file";
        } else {
          profileNote =
            "Не разпознахме колони с дата/час и kWh във файла. Използваме тарифите от фактурата.";
        }
      } catch {
        profileNote = "Файлът с профила не може да бъде прочетен. Използваме тарифите от фактурата.";
      }
    }

    if (source === "flat" && hasTariffSplit) {
      shape = tariffShape(dayShare, nightShare, worksSaturday, worksSunday);
      source = "invoice-tariff";
    }

    const to = new Date();
    const from = new Date(to.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const prices = await fetchExchangePrices(supabase, from.toISOString(), to.toISOString());

    let result: CaptureResult;

    if (prices.length >= 96 * 7) {
      result = {
        ...computeCapture(prices, shape, source),
        priceSource: "exchange-15m",
        approximate: source !== "profile-file",
        profileNote,
      };
    } else {
      const { data: market } = await supabase
        .from("market_monthly_summary")
        .select("year, month, base_price_eur_mwh, peak_price_eur_mwh, offpeak_price_eur_mwh")
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!market) return fail("Няма налични борсови цени за изчисление.", 503);

      result = {
        ...captureFromMonthlySummary(
          {
            year: market.year,
            month: market.month,
            base: Number(market.base_price_eur_mwh || 0),
            peak: Number(market.peak_price_eur_mwh || 0),
            offpeak: Number(market.offpeak_price_eur_mwh || 0),
          },
          dayShare,
          nightShare,
          source === "profile-file" ? "invoice-tariff" : source
        ),
        priceSource: "monthly-summary",
        approximate: true,
        profileNote,
      };
    }

    const paidPrice = Number(invoice.energy_price_eur_mwh || 0);

    return NextResponse.json({
      success: true,
      capture: { ...result, paidPrice: paidPrice > 0 ? paidPrice : null },
    });
  } catch (error) {
    console.error("[pre-auction-capture]", error);
    return fail("Изчислението на capture не успя. Опитайте отново.", 500);
  }
}
