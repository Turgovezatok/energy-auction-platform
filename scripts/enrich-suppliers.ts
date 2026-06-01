import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data: suppliers, error } = await supabase
    .from("suppliers")
    .select("*")
    .limit(5);

  if (error) {
    console.error(error);
    return;
  }

  console.log("Suppliers found:", suppliers?.length);

  for (const supplier of suppliers || []) {
    console.log(supplier.supplier_name);
  }
}

main();
