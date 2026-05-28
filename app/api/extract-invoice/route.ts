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
      return NextResponse.json(
        { error: "Missing fileUrl" },
        { status: 400 }
      );
    }

    const pdfServiceResponse = await fetch(
      `${process.env.PDF_SERVICE_URL}/extract`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileUrl,
        }),
      }
    );

    const pdfResult = await pdfServiceResponse.json();

    if (!pdfServiceResponse.ok || !pdfResult.text) {
      throw new Error(
        pdfResult.detail || "PDF extraction failed"
      );
    }

    const trimmedText = pdfResult.text.slice(0, 120000);

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
              content: `You extract structured electricity invoice data.

Return ONLY valid JSON.
Do not invent data.
If a field is not visible in the invoice, return null.
Use only values explicitly present in the invoice text.

supplier_name = the electricity supplier.
company_name = the customer.

Never use supplier as customer.`,
            },
            {
              role: "user",
              content: `Analyze this electricity invoice text:

${trimmedText}

Extract:
- invoice_number
- invoice_date
- company_name
- EIK
- VAT_number
- client_number
- reporting_period
- supplier_name
- total_consumption_MWh
- energy_price_EUR_MWh

Return JSON with:
{
  "invoice_number": null,
  "invoice_date": null,
  "company_name": null,
  "EIK": null,
  "VAT_number": null,
  "client_number": null,
  "reporting_period": null,
  "supplier_name": null,
  "total_consumption_MWh": null,
  "energy_price_EUR_MWh": null,
  "sites": []
}`,
            },
          ],
          temperature: 0,
        }),
      }
    );

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();

      throw new Error(
        `OpenAI extraction failed: ${errorText}`
      );
    }

    const result = await openaiResponse.json();

    const content =
      result.choices?.[0]?.message?.content;

    let extracted: any = {};

    try {
      extracted = JSON.parse(content || "{}");
    } catch {
      extracted = {
        raw_response: content,
      };
    }

    const { data: uploadRecord } = await supabase
      .from("invoice_uploads")
      .select("*")
      .eq("file_url", fileUrl)
      .single();

    if (uploadRecord) {
      await supabase
        .from("invoice_uploads")
        .update({
          supplier_name:
            extracted.supplier_name || null,
          invoice_number:
            extracted.invoice_number || null,
          customer_name:
            extracted.company_name || null,
          customer_eik:
            extracted.EIK || null,
          customer_vat:
            extracted.VAT_number || null,
          customer_number:
            extracted.client_number || null,
          total_consumption_mwh:
            extracted.total_consumption_MWh ||
            null,
          energy_price_eur_mwh:
            extracted.energy_price_EUR_MWh ||
            null,
          extracted_json: extracted,
          extraction_status: "completed",
        })
        .eq("id", uploadRecord.id);
    }

    return NextResponse.json({
      success: true,
      extracted,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error.message || "Extraction failed",
      },
      {
        status: 500,
      }
    );
  }
}
