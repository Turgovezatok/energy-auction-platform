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
    .is("email", null)
    .limit(20);

  if (error) {
    console.error(error);
    return;
  }

  for (const supplier of suppliers || []) {
    console.log(
      "Enrich supplier:",
      supplier.supplier_name
    );

    const enriched = manualSupplierData(
      supplier.supplier_name
    );

    if (!enriched) {
      console.log("No data found");
      continue;
    }

    const { error: updateError } = await supabase
      .from("suppliers")
      .update({
        company_eik:
          enriched.company_eik || null,

        email:
          enriched.email || null,

        phone:
          enriched.phone || null,

        website:
          enriched.website || null,

        contact_person:
          enriched.contact_person || null,

        invitation_email:
          enriched.email || null,

        data_source:
          enriched.data_source || "manual",

        enriched_at:
          new Date().toISOString(),
      })
      .eq("id", supplier.id);

    if (updateError) {
      console.error(updateError);
    } else {
      console.log(
        "Updated:",
        supplier.supplier_name
      );
    }
  }
}

function manualSupplierData(name: string) {
  const normalized =
    name.toLowerCase();

  if (
    normalized.includes("нек")
  ) {
    return {
      company_eik: "",
      email: "nek@nek.bg",
      phone: "+359 2 9263 636",
      website: "https://www.nek.bg",
      contact_person: "",
      data_source: "public website",
    };
  }

  if (
    normalized.includes(
      "енерджи инвест"
    )
  ) {
    return {
      company_eik: "201315403",
      email:
        "office@energyinvest.bg",
      phone:
        "+359 2 854 80 44",
      website:
        "https://energyinvest.bg",
      contact_person: "",
      data_source: "public website",
    };
  }

  if (
    normalized.includes(
      "енергео"
    )
  ) {
    return {
      company_eik: "",
      email:
        "office@energeo.bg",
      phone: "",
      website:
        "https://energeo.bg",
      contact_person: "",
      data_source: "public website",
    };
  }

  if (
    normalized.includes("евн") ||
    normalized.includes("evn")
  ) {
    return {
      company_eik: "",
      email:
        "info@evn-trading.com",
      phone: "",
      website:
        "https://www.evn-trading.com",
      contact_person: "",
      data_source: "public website",
    };
  }

  return null;
}

main();
