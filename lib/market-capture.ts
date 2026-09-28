import * as XLSX from "xlsx";
import type { SupabaseClient } from "@supabase/supabase-js";

export type DayType = 0 | 1 | 2;
export type LoadShape = number[][];

export type PricePoint = { ts: number; price: number };

export type CaptureSource = "profile-file" | "invoice-tariff" | "flat";

export type CaptureResult = {
  source: CaptureSource;
  priceSource: "exchange-15m" | "monthly-summary";
  approximate: boolean;
  periodFrom: string;
  periodTo: string;
  basePrice: number;
  peakPrice: number;
  offpeakPrice: number;
  capturePrice: number;
  profileFactor: number;
  volatility: number;
  riskScore: number;
  riskLevel: "low" | "medium" | "high";
  recommendedModel: "fixed-price" | "hybrid" | "day-ahead-plus-adder";
  profileNote: string | null;
};

const PAGE = 1000;
const DAY_START_HOUR = 6;
const DAY_END_HOUR = 22;
const PEAK_START_HOUR = 8;
const PEAK_END_HOUR = 20;
const NON_WORKING_WEEKEND_FACTOR = 0.3;

const sofiaParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Sofia",
  hour: "2-digit",
  weekday: "short",
  hourCycle: "h23",
});

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

function dayTypeOf(weekday: number): DayType {
  if (weekday === 6) return 1;
  if (weekday === 0) return 2;
  return 0;
}

function sofiaSlot(ts: number): { dayType: DayType; hour: number } {
  let hour = 0;
  let weekday = 1;
  for (const part of sofiaParts.formatToParts(ts)) {
    if (part.type === "hour") hour = Number(part.value);
    if (part.type === "weekday") weekday = WEEKDAY_INDEX[part.value] ?? 1;
  }
  return { dayType: dayTypeOf(weekday), hour };
}

export async function fetchExchangePrices(
  supabase: SupabaseClient,
  fromIso: string,
  toIso: string
): Promise<PricePoint[]> {
  const { count, error } = await supabase
    .from("energy_market_data_15m")
    .select("timestamp_utc", { count: "exact", head: true })
    .gte("timestamp_utc", fromIso)
    .lt("timestamp_utc", toIso);

  if (error) throw new Error(error.message);
  if (!count) return [];

  const pages = Array.from({ length: Math.ceil(count / PAGE) }, (_, i) =>
    supabase
      .from("energy_market_data_15m")
      .select("timestamp_utc, dayahead_price")
      .gte("timestamp_utc", fromIso)
      .lt("timestamp_utc", toIso)
      .order("timestamp_utc")
      .range(i * PAGE, i * PAGE + PAGE - 1)
  );

  const results = await Promise.all(pages);
  const points: PricePoint[] = [];
  for (const { data, error: pageError } of results) {
    if (pageError) throw new Error(pageError.message);
    for (const row of data || []) {
      const price = Number(row.dayahead_price);
      if (Number.isFinite(price)) {
        points.push({ ts: Date.parse(row.timestamp_utc), price });
      }
    }
  }
  return points;
}

function emptyShape(): LoadShape {
  return [0, 1, 2].map(() => Array(24).fill(0));
}

export function tariffShape(
  dayShare: number,
  nightShare: number,
  worksSaturday: boolean,
  worksSunday: boolean
): LoadShape {
  const dayHours = DAY_END_HOUR - DAY_START_HOUR;
  const perDayHour = dayShare / dayHours;
  const perNightHour = nightShare / (24 - dayHours);
  const shape = emptyShape();
  for (const dayType of [0, 1, 2] as DayType[]) {
    const factor =
      (dayType === 1 && !worksSaturday) || (dayType === 2 && !worksSunday)
        ? NON_WORKING_WEEKEND_FACTOR
        : 1;
    for (let h = 0; h < 24; h++) {
      const isDay = h >= DAY_START_HOUR && h < DAY_END_HOUR;
      shape[dayType][h] = (isDay ? perDayHour : perNightHour) * factor;
    }
  }
  return shape;
}

export function flatShape(): LoadShape {
  return [0, 1, 2].map(() => Array(24).fill(1));
}

function toNumber(cell: unknown): number | null {
  if (typeof cell === "number") return Number.isFinite(cell) ? cell : null;
  if (typeof cell !== "string") return null;
  const cleaned = cell.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned);
}

type ParsedDate = { weekday: number; hour: number | null };

const DMY = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:[ T,]+(\d{1,2}):(\d{2}))?/;
const YMD = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?/;
const TIME = /^(\d{1,2}):(\d{2})/;

function toDate(cell: unknown): ParsedDate | null {
  if (cell instanceof Date && !Number.isNaN(cell.getTime())) {
    const hasTime = cell.getUTCHours() !== 0 || cell.getUTCMinutes() !== 0;
    return { weekday: cell.getUTCDay(), hour: hasTime ? cell.getUTCHours() : null };
  }
  if (typeof cell !== "string") return null;
  const text = cell.trim();
  const dmy = DMY.exec(text);
  const ymd = dmy ? null : YMD.exec(text);
  if (!dmy && !ymd) return null;
  const [y, m, d] = dmy
    ? [Number(dmy[3]), Number(dmy[2]), Number(dmy[1])]
    : [Number(ymd![1]), Number(ymd![2]), Number(ymd![3])];
  const hourText = dmy ? dmy[4] : ymd![4];
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  if (Number.isNaN(weekday)) return null;
  return { weekday, hour: hourText !== undefined ? Number(hourText) : null };
}

function toHour(cell: unknown): number | null {
  if (cell instanceof Date) return cell.getUTCHours();
  if (typeof cell !== "string") return null;
  const match = TIME.exec(cell.trim());
  return match ? Number(match[1]) : null;
}

export function parseLoadProfile(
  buffer: Buffer,
  fileName: string
): { shape: LoadShape; points: number } | null {
  const isCsv = fileName.toLowerCase().endsWith(".csv");
  const workbook = isCsv
    ? XLSX.read(buffer.toString("utf8"), { type: "string", raw: true })
    : XLSX.read(buffer, { type: "buffer", cellDates: true, UTC: true });

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return null;

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    UTC: true,
    blankrows: false,
  });

  const sums = emptyShape();
  const counts = emptyShape();
  let points = 0;

  function add(weekday: number, hour: number, kwh: number) {
    if (hour < 0 || hour > 23 || kwh < 0) return;
    const dayType = dayTypeOf(weekday);
    sums[dayType][hour] += kwh;
    counts[dayType][hour] += 1;
    points += 1;
  }

  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    const dateIndex = row.findIndex((cell) => toDate(cell) !== null);
    if (dateIndex === -1) continue;
    const date = toDate(row[dateIndex])!;

    let hour = date.hour;
    let valueStart = dateIndex + 1;
    if (hour === null && valueStart < row.length) {
      const separateHour = toHour(row[valueStart]);
      if (separateHour !== null) {
        hour = separateHour;
        valueStart += 1;
      }
    }

    const values = row
      .slice(valueStart)
      .map(toNumber)
      .filter((v): v is number => v !== null);

    if (hour === null && (values.length === 24 || values.length === 96)) {
      const perHour = values.length / 24;
      for (let h = 0; h < 24; h++) {
        let kwh = 0;
        for (let q = 0; q < perHour; q++) kwh += values[h * perHour + q];
        add(date.weekday, h, kwh);
      }
      continue;
    }

    if (hour !== null && values.length > 0) {
      add(date.weekday, hour, values[values.length - 1]);
    }
  }

  const coveredHours = counts[0].filter((c) => c > 0).length;
  if (points < 96 || coveredHours < 12) return null;

  const shape = emptyShape();
  for (const dayType of [0, 1, 2] as DayType[]) {
    for (let h = 0; h < 24; h++) {
      const fallback = counts[0][h] ? sums[0][h] / counts[0][h] : 0;
      shape[dayType][h] = counts[dayType][h]
        ? sums[dayType][h] / counts[dayType][h]
        : fallback;
    }
  }
  return { shape, points };
}

function riskLevelOf(score: number): CaptureResult["riskLevel"] {
  if (score >= 75) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function recommendedModelOf(
  score: number,
  volatility: number
): CaptureResult["recommendedModel"] {
  if (score >= 75 || volatility >= 1.2) return "day-ahead-plus-adder";
  if (score >= 45) return "hybrid";
  return "fixed-price";
}

function shapeConcentration(shape: LoadShape): number {
  const weekday = shape[0];
  const day = weekday.slice(DAY_START_HOUR, DAY_END_HOUR);
  const night = [...weekday.slice(0, DAY_START_HOUR), ...weekday.slice(DAY_END_HOUR)];
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
  const nightAvg = avg(night);
  return nightAvg > 0 ? avg(day) / nightAvg : 3;
}

function riskScoreOf(volatility: number, shape: LoadShape, source: CaptureSource) {
  let score = Math.min(volatility * 30, 40);
  const ratio = shapeConcentration(shape);
  if (ratio > 3) score += 35;
  else if (ratio > 2) score += 25;
  else if (ratio > 1.3) score += 15;
  else score += 8;
  if (source !== "profile-file") score += source === "flat" ? 25 : 12;
  return Math.min(Math.round(score), 100);
}

export function computeCapture(
  prices: PricePoint[],
  shape: LoadShape,
  source: CaptureSource
): Omit<CaptureResult, "priceSource" | "approximate" | "profileNote"> {
  let weightedSum = 0;
  let weightTotal = 0;
  let sum = 0;
  let sumSq = 0;
  let peakSum = 0;
  let peakCount = 0;

  for (const { ts, price } of prices) {
    const { dayType, hour } = sofiaSlot(ts);
    const weight = shape[dayType][hour];
    weightedSum += weight * price;
    weightTotal += weight;
    sum += price;
    sumSq += price * price;
    if (dayType === 0 && hour >= PEAK_START_HOUR && hour < PEAK_END_HOUR) {
      peakSum += price;
      peakCount += 1;
    }
  }

  const n = prices.length;
  const base = sum / n;
  const std = Math.sqrt(Math.max(sumSq / n - base * base, 0));
  const peak = peakCount ? peakSum / peakCount : base;
  const offpeak = n > peakCount ? (sum - peakSum) / (n - peakCount) : base;
  const capture = weightTotal > 0 ? weightedSum / weightTotal : base;
  const volatility = base !== 0 ? std / Math.abs(base) : 0;
  const riskScore = riskScoreOf(volatility, shape, source);

  return {
    source,
    periodFrom: new Date(prices[0].ts).toISOString().slice(0, 10),
    periodTo: new Date(prices[n - 1].ts).toISOString().slice(0, 10),
    basePrice: round(base),
    peakPrice: round(peak),
    offpeakPrice: round(offpeak),
    capturePrice: round(capture),
    profileFactor: base !== 0 ? Number((capture / base).toFixed(3)) : 1,
    volatility: Number(volatility.toFixed(3)),
    riskScore,
    riskLevel: riskLevelOf(riskScore),
    recommendedModel: recommendedModelOf(riskScore, volatility),
  };
}

export function captureFromMonthlySummary(
  market: { year: number; month: number; base: number; peak: number; offpeak: number },
  dayShare: number,
  nightShare: number,
  source: CaptureSource
): Omit<CaptureResult, "priceSource" | "approximate" | "profileNote"> {
  const capture =
    source === "flat" || dayShare + nightShare === 0
      ? market.base
      : dayShare * market.peak + nightShare * market.offpeak || market.base;
  const shape =
    source === "flat" ? flatShape() : tariffShape(dayShare, nightShare, true, true);
  const riskScore = riskScoreOf(0.5, shape, source);
  const period = `${market.year}-${String(market.month).padStart(2, "0")}`;

  return {
    source,
    periodFrom: `${period}-01`,
    periodTo: `${period}-28`,
    basePrice: round(market.base),
    peakPrice: round(market.peak),
    offpeakPrice: round(market.offpeak),
    capturePrice: round(capture),
    profileFactor: market.base ? Number((capture / market.base).toFixed(3)) : 1,
    volatility: 0.5,
    riskScore,
    riskLevel: riskLevelOf(riskScore),
    recommendedModel: recommendedModelOf(riskScore, 0.5),
  };
}

function round(value: number) {
  return Number(value.toFixed(2));
}
