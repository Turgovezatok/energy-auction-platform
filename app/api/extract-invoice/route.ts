export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
export async function POST(req: Request) {
  try {
    const { fileUrl } = await req.json();

    if (!fileUrl) {
     const { data: uploadRecord } =
  await supabase
    .from("invoice_uploads")
    .select("*")
    .eq("file_url", fileUrl)
    .single();

if (uploadRecord) {
  await supabase
    .from("invoice_sites")
    .insert({
      invoice_upload_id:
        uploadRecord.id,

      itn_number:
        extracted.ITN_numbers?.[0] ||
        null,

      supplier_name:
        extracted.supplier_name ||
        null,

      total_consumption_mwh:
        extracted.total_consumption_MWh ||
        null,

      capture_price:
        extracted.capture_price_estimation ||
        null,

      reporting_period_start:
        extracted.reporting_period
          ?.start_date || null,

      reporting_period_end:
        extracted.reporting_period
          ?.end_date || null,
    });
}
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
