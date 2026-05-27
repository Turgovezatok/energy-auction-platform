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
          messages: [
            {
              role: "system",
              content:
                "You extract structured electricity invoice data.",
            },
            {
              role: "user",
              content: `
Analyze this electricity invoice PDF:

${fileUrl}

Extract:
- invoice number
- invoice date
- company name
- EIK
- VAT number
- client number
- ITN numbers
- reporting period
- total consumption MWh
- day/night consumption
- energy price
- capture price estimation
- supplier name

Return ONLY valid JSON.
`,
            },
          ],
          temperature: 0,
        }),
      }
    );

    const result = await openaiResponse.json();

    return NextResponse.json({
      extracted:
        result.choices?.[0]?.message?.content ||
        result,
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
