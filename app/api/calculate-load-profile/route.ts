export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeZone(zoneName: string | null, zoneCode: string | null) {
  const value = `${zoneName || ""} ${zoneCode || ""}`.toLowerCase();

  if (
    value.includes("днев") ||
    value.includes("day") ||
    value.includes("д ")
  ) {
    return "day";
  }

  if (
    value.includes("нощ") ||
    value.includes("night") ||
    value.includes("н ")
  ) {
    return "night";
  }

  if (value.includes("peak") || value.includes("върх")) {
    return "peak";
  }

  if (value.includes("off") || value.includes("невърх")) {
    return "offpeak";
  }

  return "unknown";
}

function safeNumber(value: any): number {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function calculateProfileType(dayShare: number, nightShare: number) {
  if (dayShare >= 0.7) return "day-heavy";
  if (nightShare >= 0.45) return "night-heavy";
  if (dayShare >= 0.45 && nightShare >= 0.25) return "balanced";
  return "quantity-only";
}

function calculateRiskLevel(dayNightRatio: number | null, profileQuality: string) {
  if (profileQuality !== "full-profile") return "medium";
  if (!dayNightRatio) return "medium";
  if (dayNightRatio > 3) return "high";
  if (dayNightRatio < 1.3) return "low";
  return "medium";
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

    const { data: sites, error: sitesError } = await supabase
      .from("invoice_sites")
      .select("id, consumption_mwh")
      .eq("invoice_id", invoiceId);

    if (sitesError) {
      throw new Error(sitesError.message);
    }

    const siteIds = (sites || []).map((site: any) => site.id);

    let zones: any[] = [];

    if (siteIds.length > 0) {
      const { data: zoneData, error: zonesError } = await supabase
        .from("invoice_site_zones")
        .select("*")
        .in("invoice_site_id", siteIds);

      if (zonesError) {
        throw new Error(zonesError.message);
      }

      zones = zoneData || [];
    }

    let dayKwh = 0;
    let nightKwh = 0;
    let peakKwh = 0;
    let offpeakKwh = 0;
    let unknownKwh = 0;

    for (const zone of zones) {
      const kwh = safeNumber(zone.consumption_kwh);
      const type = normalizeZone(zone.zone_name, zone.zone_code);

      if (type === "day") dayKwh += kwh;
      else if (type === "night") nightKwh += kwh;
      else if (type === "peak") peakKwh += kwh;
      else if (type === "offpeak") offpeakKwh += kwh;
      else unknownKwh += kwh;
    }

    const totalFromZonesKwh =
      dayKwh + nightKwh + peakKwh + offpeakKwh + unknownKwh;

    const totalFromSitesKwh = (sites || []).reduce(
      (sum: number, site: any) => sum + safeNumber(site.consumption_mwh) * 1000,
      0
    );

    const totalKwh = totalFromZonesKwh || totalFromSitesKwh;
    const totalMwh = totalKwh / 1000;

    const dayShare = totalKwh > 0 ? dayKwh / totalKwh : 0;
    const nightShare = totalKwh > 0 ? nightKwh / totalKwh : 0;
    const peakShare = totalKwh > 0 ? peakKwh / totalKwh : 0;
    const offpeakShare = totalKwh > 0 ? offpeakKwh / totalKwh : 0;

    const billingDays = 30;

    const dayHours = billingDays * 16;
    const nightHours = billingDays * 8;
    const peakHours = billingDays * 16;
    const offpeakHours = billingDays * 8;

    const avgTotalLoadKw = totalKwh / (billingDays * 24);
    const avgDayLoadKw = dayHours > 0 ? dayKwh / dayHours : 0;
    const avgNightLoadKw = nightHours > 0 ? nightKwh / nightHours : 0;
    const avgPeakLoadKw = peakHours > 0 ? peakKwh / peakHours : 0;
    const avgOffpeakLoadKw = offpeakHours > 0 ? offpeakKwh / offpeakHours : 0;

    const dayNightLoadRatio =
      avgNightLoadKw > 0 ? avgDayLoadKw / avgNightLoadKw : null;

    const peakOffpeakLoadRatio =
      avgOffpeakLoadKw > 0 ? avgPeakLoadKw / avgOffpeakLoadKw : null;

    const baseloadKw =
      avgNightLoadKw > 0 ? avgNightLoadKw : avgOffpeakLoadKw || avgTotalLoadKw;

    const maxEstimatedLoadKw = Math.max(
      avgDayLoadKw,
      avgNightLoadKw,
      avgPeakLoadKw,
      avgOffpeakLoadKw,
      avgTotalLoadKw
    );

    const profileQuality =
      totalFromZonesKwh > 0 ? "full-profile" : "quantity-only";

    const profileType = calculateProfileType(dayShare, nightShare);
    const riskLevel = calculateRiskLevel(dayNightLoadRatio, profileQuality);

    await supabase
      .from("invoice_load_profiles")
      .delete()
      .eq("invoice_id", invoiceId);

    const { data: profile, error: insertError } = await supabase
      .from("invoice_load_profiles")
      .insert({
        invoice_id: invoiceId,

        total_consumption_kwh: totalKwh,
        total_consumption_mwh: totalMwh,

        day_consumption_kwh: dayKwh,
        night_consumption_kwh: nightKwh,
        peak_consumption_kwh: peakKwh,
        offpeak_consumption_kwh: offpeakKwh,

        day_share: dayShare,
        night_share: nightShare,
        peak_share: peakShare,
        offpeak_share: offpeakShare,

        billing_days: billingDays,
        day_hours: dayHours,
        night_hours: nightHours,
        peak_hours: peakHours,
        offpeak_hours: offpeakHours,

        avg_total_load_kw: avgTotalLoadKw,
        avg_day_load_kw: avgDayLoadKw,
        avg_night_load_kw: avgNightLoadKw,
        avg_peak_load_kw: avgPeakLoadKw,
        avg_offpeak_load_kw: avgOffpeakLoadKw,

        day_night_load_ratio: dayNightLoadRatio,
        peak_offpeak_load_ratio: peakOffpeakLoadRatio,

        baseload_kw: baseloadKw,
        max_estimated_load_kw: maxEstimatedLoadKw,

        profile_type: profileType,
        profile_quality: profileQuality,
        risk_level: riskLevel,

        notes: `Auto calculated from invoice tariff zones. Unknown kWh: ${unknownKwh}`,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Load profile calculation failed",
      },
      { status: 500 }
    );
  }
}
