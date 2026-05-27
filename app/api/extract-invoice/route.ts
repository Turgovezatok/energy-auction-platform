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

    return NextResponse.json({
      extracted: {
        status: "received",
        file_url: fileUrl,
        message:
          "Фактурата е получена успешно. Следваща стъпка: AI extraction.",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Extraction failed" },
      { status: 500 }
    );
  }
}
