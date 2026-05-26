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

  const vatMatch =
    text.match(/BG\d{9}/i);

  const clientNumberMatch =
    text.match(/Клиентски номер\s*(\d+)/i) ||
    text.match(/Клиентски Номер:\s*(\d+)/i);

  const periodMatch =
    text.match(/Отчетен период[:\s]*(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})/i) ||
    text.match(/Отчетен период от\s*(\d{2}\.\d{2}\.\d{4})\s*до\s*(\d{2}\.\d{2}\.\d{4})/i);

  const evnEnergyMatch =
    text.match(/Ел\. енергия\s+кВтч\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);

  const tokiEnergyMwhMatch =
   text.replace(/\n/g, " ").match(/Активна енергия.*?MWh\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);

  let consumptionMwh = null;
  let energyPrice = null;
  let energyCost = null;

  if (evnEnergyMatch) {
    const kwh = toNumber(evnEnergyMatch[1]);
    const priceLvKwh = toNumber(evnEnergyMatch[2]);
    const costLv = toNumber(evnEnergyMatch[3]);

    consumptionMwh = kwh ? kwh / 1000 : null;
    energyPrice = priceLvKwh ? (priceLvKwh * 1000) / 1.95583 : null;
    energyCost = costLv ? costLv / 1.95583 : null;
  }

  if (tokiEnergyMwhMatch) {
    consumptionMwh = toNumber(tokiEnergyMwhMatch[1]);
    energyPrice = toNumber(tokiEnergyMwhMatch[2]);
    energyCost = toNumber(tokiEnergyMwhMatch[3]);
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
    const match = line.match(/^\s*\d+\s+([ДН])\s+\S+\s+[\d.]+\s+[\d.]+\s+([\d.]+)/);

    if (match) {
      zones.push({
        zone_code: match[1],
        zone_name: match[1] === "Д" ? "Дневна" : "Нощна",
        consumption_kwh: toNumber(match[2]),
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
    total_consumption_mwh: consumptionMwh,
    energy_price_eur_mwh: energyPrice,
    energy_cost_eur: energyCost,
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
