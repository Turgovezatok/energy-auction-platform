export const runtime = "nodejs";

import { NextResponse } from "next/server";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

function toNumber(value: string | null) {
  if (!value) return null;

  return Number(
    value
      .replace(",", ".")
      .replace(/\s/g, "")
  );
}

function extractInvoiceData(text: string) {
  const invoiceMatch =
    text.match(
      /Фактура №[:\s]*(\d+)\s*\/\s*(\d{2}\.\d{2}\.\d{4})/i
    ) ||
    text.match(
      /Фактура № \/ дата\s*(\d+)\/(\d{2}\.\d{2}\.\d{4})/i
    );

  const customerMatch =
    text.match(
      /Получател на доставката\s+(.+)/i
    ) ||
    text.match(
      /ПОЛУЧАТЕЛ НА ДОСТАВКАТА:\s+(.+)/i
    );

  const eikMatch =
    text.match(
      /Идентификационен №:\s*(\d+)/i
    ) ||
    text.match(/ЕИК:\s*(\d+)/i);

  const vatMatch =
    text.match(/BG\d{9}/i);

  const clientNumberMatch =
    text.match(
      /Клиентски номер\s*(\d+)/i
    ) ||
    text.match(
      /Клиентски Номер:\s*(\d+)/i
    );

  const periodMatch =
    text.match(
      /Отчетен период[:\s]*(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})/i
    ) ||
    text.match(
      /Отчетен период от\s*(\d{2}\.\d{2}\.\d{4})\s*до\s*(\d{2}\.\d{2}\.\d{4})/i
    );

  const itnMatches: string[] = [];

  const itnRegex =
    /Обект ИТН №\s*(\d+)/g;

  let itnMatch;

  while (
    (itnMatch = itnRegex.exec(text)) !==
    null
  ) {
    itnMatches.push(itnMatch[1]);
  }

  return {
    invoice_number:
      invoiceMatch?.[1] || null,

    invoice_date:
      invoiceMatch?.[2] || null,

    customer_name:
      customerMatch?.[1]?.trim() ||
      null,

    customer_eik:
      eikMatch?.[1] || null,

    customer_vat:
      vatMatch?.[0] || null,

    customer_number:
      clientNumberMatch?.[1] ||
      null,

    period_start:
      periodMatch?.[1] || null,

    period_end:
      periodMatch?.[2] || null,

    itn_numbers: itnMatches,

    raw_text_preview:
      text.slice(0, 3000),
  };
}

async function extractTextFromPdf(
  buffer: Buffer
) {
  const loadingTask =
    pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
    });

  const pdf =
    await loadingTask.promise;

  let fullText = "";

  for (
    let pageNum = 1;
    pageNum <= pdf.numPages;
    pageNum++
  ) {
    const page =
      await pdf.getPage(pageNum);

    const content =
      await page.getTextContent();

    const strings = content.items.map(
      (item: any) => item.str
    );

    fullText +=
      strings.join(" ") + "\n";
  }

  return fullText;
}

export async function POST(
  req: Request
) {
  try {
    const { fileUrl } =
      await req.json();

    if (!fileUrl) {
      return NextResponse.json(
        {
          error:
            "Missing fileUrl",
        },
        { status: 400 }
      );
    }

    const response =
      await fetch(fileUrl);

    const arrayBuffer =
      await response.arrayBuffer();

    const buffer = Buffer.from(
      arrayBuffer
    );

    const text =
      await extractTextFromPdf(
        buffer
      );

    const extracted =
      extractInvoiceData(text);

    return NextResponse.json({
      extracted,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error.message ||
          "Extraction failed",
      },
      { status: 500 }
    );
  }
}
