export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { fileUrl } = await req.json();

    if (!fileUrl) {
      return NextResponse.json(
        { error: "Missing fileUrl" },
        { status: 400 }
      );
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
          response_format: {
            type: "json_object",
          },
          messages: [
            {
              role: "system",
              content: `
You extract structured electricity invoice data.

Return ONLY valid JSON.
`,
            },
            {
              role: "user",
              content: `
Analyze this electricity invoice PDF:

${fileUrl}

Extract:
- invoice_number
- invoice_date
- company_name
- EIK
- VAT_number
- client_number
- ITN_numbers
- reporting_period
- total_consumption_MWh
- day_consumption_MWh
- night_consumption_MWh
- energy_price_EUR_MWh
- capture_price_estimation
- supplier_name
`,
            },
          ],
          temperature: 0,
        }),
      }
    );

    const result = await openaiResponse.json();

    const content =
      result.choices?.[0]?.message?.content;

    let extracted = null;

    try {
      extracted = JSON.parse(content);
    } catch {
      extracted = {
        raw_response: content,
      };
    }

    return NextResponse.json({
      extracted,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error.message || "Extraction failed",
      },
      { status: 500 }
    );
  }
}
