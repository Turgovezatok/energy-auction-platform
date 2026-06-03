import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const eik = searchParams.get("eik");

  if (!eik) {
    return NextResponse.json({
      error: "Missing EIK",
    });
  }

  const { data, error } = await supabase
    .from("Регистър издадени гаранции")
    .select("*")
    .eq("Булстат/ЕИК", eik);

  if (error) {
    return NextResponse.json({
      error: error.message,
    });
  }

  return NextResponse.json(data);
}
