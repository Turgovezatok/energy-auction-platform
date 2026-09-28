import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// invoice_sites is RLS-protected from the anon key, so the confirm page reads
// the sites of one invoice through this route, scoped strictly by invoiceId.
export async function GET(request: Request) {
  const invoiceId = new URL(request.url).searchParams.get("invoiceId");

  if (!invoiceId || !UUID_PATTERN.test(invoiceId)) {
    return NextResponse.json({ error: "Invalid invoiceId" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("invoice_sites")
    .select(
      "id, invoice_id, itn, meter_number, site_name, address, voltage_level, profile_type, distribution_operator, consumption_mwh, energy_price_eur_mwh, network_cost_eur"
    )
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Could not load sites" }, { status: 500 });
  }

  return NextResponse.json({ sites: data ?? [] });
}
