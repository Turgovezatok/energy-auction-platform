export const runtime = "nodejs";

import { NextResponse } from "next/server";

const pdf = require("pdf-parse");

function toNumber(value: string | null) {
  if (!value) return null;

  return Number(value.replace(",", ".").replace(/\s/g, ""));
}

function extractInvoiceData(text: string) {
  const invoiceMatch =
    text.match(/Фактура №[:\s]*(\d+)\s*\/\s*(\d{2}\.\d{2}\.\d{4})/i) ||
    text.match(/Фактура № \/ дата\s*(\d+)\/(\d{2}\.\d{2}\.\d{4})/i);

  const customerMatch =
    text.match(/Получател на доставката\s+(.+)/i) ||
    text.match(/ПОЛУЧАТЕЛ НА ДОСТАВКАТА:\s+(.+)/i);

  const eikMatch =
    text.match(/Идентификационен №:\s*(\d+)/i) ||
    text.match(/ЕИК:\s*(\d+)/i);

  const vatMatch = text.match(/BG\d{9}/i);

  const clientNumberMatch =
    text.match(/Клиентски номер\s*(\d+)/i) ||
    text.match(/Клиентски Номер:\s*(\d+)/i);

  const periodMatch =
    text.match(
      /Отчетен период[:\s]*(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})/i
    ) ||
    text.match(
      /Отчетен период от\s*(\d{2}\.\d{2}\.\d{4})\s*до\s*(\d{2}\.\d{2}\.\d{4})/i
    );

  const evnEnergyMatch = text.match(
    /Ел\. енергия\s+кВтч\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i
  );

  const flatText = text.replace(/\n/g, " ");

  const tokiEnergyMwhMatch = flatText.match(
    /Активна енергия.*?MWh\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i
  );

  let totalConsumptionMwh = null;
  let energyPriceEurMwh = null;
  let energyCostEur = null;

  if (evnEnergyMatch) {
    const kwh = toNumber(evnEnergyMatch[1]);
    const priceLvKwh = toNumber(evnEnergyMatch[2]);
    const costLv = toNumber(evnEnergyMatch[3]);

    totalConsumptionMwh = kwh ? kwh / 1000 : null;
    energyPriceEurMwh = priceLvKwh ? (priceLvKwh * 1000) / 1.95583 : null;
    energyCostEur = costLv ? costLv / 1.95583 : null;
  }

  if (tokiEnergyMwhMatch) {
    totalConsumptionMwh = toNumber(tokiEnergyMwhMatch[1]);
    energyPriceEurMwh = toNumber(tokiEnergyMwhMatch[2]);
    energyCostEur = toNumber(tokiEnergyMwhMatch[3]);
  }

  const itnMatches: string[] = [];
  const itnRegex = /Обект ИТН №\s*(\d+)/g;
  let itnMatch;

  while ((itnMatch = itnRegex.exec(text)) !== null) {
    itnMatches.push(itnMatch[1]);
  }

  const zones: any[] = [];
  const lines = text.split("\n");

  for (const line of lines) {
    const zoneMatch = line.match(
      /^\s*\d+\s+([ДН])\s+\S+\s+[\d.]+\s+[\d.]+\s+([\d.]+)/
    );

    if (zoneMatch) {
      zones.push({
        zone_code: zoneMatch[1],
        zone_name: zoneMatch[1] === "Д" ? "Дневна" : "Нощна",
        consumption_kwh: toNumber(zoneMatch[2]),
      });
    }
  }

  return {
    invoice_number: invoiceMatch?.[1] || null,
    invoice_date: invoiceMatch?.[2] || null,
    customer_name: customerMatch?.[1]?.trim() || null,
    customer_eik: eikMatch?.[1] || null,
    customer_vat: vatMatch?.[0] || null,
    customer_number: clientNumberMatch?.[1] || null,
    period_start: periodMatch?.[1] || null,
    period_end: periodMatch?.[2] || null,
    total_consumption_mwh: totalConsumptionMwh,
    energy_price_eur_mwh: energyPriceEurMwh,
    energy_cost_eur: energyCostEur,
    itn_numbers: itnMatches,
    zones,
    raw_text_preview: text.slice(0, 3000),
  };
}

export async function POST(req: Request) {
  try {
    const { fileUrl } = await req.json();

    if (!fileUrl) {
      return NextResponse.json({ error: "Missing fileUrl" }, { status: 400 });
    }

    const response = await fetch(fileUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parsed = await pdf(buffer);
    const extracted = extractInvoiceData(parsed.text);

    return NextResponse.json({ extracted });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Extraction failed" },
      { status: 500 }
    );
  }
}
