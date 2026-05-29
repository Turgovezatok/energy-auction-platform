export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function safeNumber(value: any): number {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function getRecommendedModel(riskScore: number, volatilityScore: number) {
  if (riskScore >= 75 || volatilityScore >= 1.2) {
    return "day-ahead-plus-adder";
  }

  if (riskScore >= 45) {
    return "hybrid";
  }

  return "fixed-price";
}

function getRiskLevel(score: number) {
  if (score >= 75) return "high";
  if (score >= 45) return "medium";
  return "low";
}

export async function POST(req: Request) {
  try {
    const { invoiceId } = await req.json();

    if (!invoiceId) {
      return NextResponse.json(
        { success: false, error: "Missing invoiceId" },
        { status: 400 }
      );
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoice_uploads")
      .select("*")
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      throw new Error("Invoice not found");
    }

    const { data: profile, error: profileError } = await supabase
      .from("invoice_load_profiles")
      .select("*")
      .eq("invoice_id", invoiceId)
      .single();

    if (profileError || !profile) {
      throw new Error("Load profile not found");
    }

    const reportingPeriod = invoice.reporting_period || "";
    const yearMatch = reportingPeriod.match(/20\d{2}/);
    const year = yearMatch ? Number(yearMatch[0]) : new Date().getFullYear();

    let month = new Date().getMonth() + 1;

    const dateMatch = reportingPeriod.match(/(\d{2})\.(\d{2})\.(20\d{2})/);

    if (dateMatch) {
      month = Number(dateMatch[2]);
    }

    const { data: market, error: marketError } = await supabase
      .from("market_monthly_summary")
      .select("*")
      .eq("year", year)
      .eq("month", month)
      .single();

    if (marketError || !market) {
      return NextResponse.json(
        {
          success: false,
          error: `Missing market data for ${month}/${year}`,
        },
        { status: 404 }
      );
    }

    const dayShare = safeNumber(profile.day_share);
    const nightShare = safeNumber(profile.night_share);
    const peakShare = safeNumber(profile.peak_share);
    const offpeakShare = safeNumber(profile.offpeak_share);

    const peakPrice = safeNumber(market.peak_price_eur_mwh);
    const offpeakPrice = safeNumber(market.offpeak_price_eur_mwh);
    const basePrice = safeNumber(market.base_price_eur_mwh);

    const effectivePeakShare = peakShare || dayShare;
    const effectiveOffpeakShare = offpeakShare || nightShare;

    let capturePrice =
      effectivePeakShare * peakPrice +
      effectiveOffpeakShare * offpeakPrice;

    if (!capturePrice || capturePrice <= 0) {
      capturePrice = basePrice;
    }

    const totalMwh = safeNumber(profile.total_consumption_mwh);
    const estimatedEnergyCost = capturePrice * totalMwh;

    const spread = safeNumber(market.spread_eur_mwh);
    const volatilityScore = safeNumber(market.volatility_score);

    const dayNightRatio = safeNumber(profile.day_night_load_ratio);

    let riskScore = 0;

    riskScore += Math.min(volatilityScore * 30, 40);

    if (dayNightRatio > 3) riskScore += 35;
    else if (dayNightRatio > 2) riskScore += 25;
    else if (dayNightRatio > 1.3) riskScore += 15;
    else riskScore += 8;

    if (profile.profile_quality !== "full-profile") {
      riskScore += 25;
    }

    riskScore = Math.min(Math.round(riskScore), 100);

    const riskLevel = getRiskLevel(riskScore);
    const recommendedPricingModel = getRecommendedModel(
      riskScore,
      volatilityScore
    );

    return NextResponse.json({
      success: true,
      capture: {
        invoice_id: invoiceId,
        year,
        month,

        market_base_price_eur_mwh: basePrice,
        market_peak_price_eur_mwh: peakPrice,
        market_offpeak_price_eur_mwh: offpeakPrice,

        day_share: dayShare,
        night_share: nightShare,
        peak_share: effectivePeakShare,
        offpeak_share: effectiveOffpeakShare,

        expected_capture_price_eur_mwh: Number(capturePrice.toFixed(3)),
        total_consumption_mwh: totalMwh,
        estimated_energy_cost_eur: Number(estimatedEnergyCost.toFixed(2)),

        spread_eur_mwh: spread,
        volatility_score: volatilityScore,

        day_night_load_ratio: profile.day_night_load_ratio,
        profile_type: profile.profile_type,
        profile_quality: profile.profile_quality,

        risk_score: riskScore,
        risk_level: riskLevel,
        recommended_pricing_model: recommendedPricingModel,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Capture calculation failed",
      },
      { status: 500 }
    );
  }
}
