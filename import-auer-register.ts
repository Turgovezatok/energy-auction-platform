import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  const workbook = XLSX.readFile("./data/Регистър издадени гаранции.xlsx");
  const sheetName = workbook.SheetNames[0];
  const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

  console.log("Total rows:", rows.length);

  for (const row of rows) {
    const producerName = row["Производител"];
    const eik = String(row["Булстат/ЕИК"] || "").trim();
    const objectName = row["Обект"];
    const address = row["Адрес"];
    const installedPower = Number(row["Инсталирана мощност"]) || 0;
    const technology = row["Технология"];
    const energyType = row["Вид енергия"];
    const producedEnergy = Number(row["Произв. енергия"]) || 0;
    const periodFrom = row["Период От"];
    const periodTo = row["Период До"];
    const supportScheme = row["Схеми за подпомагане"];

    const { data: company } = await supabase
      .from("companies")
      .upsert(
        {
          name: producerName,
          eik,
          company_type: "producer",
        },
        { onConflict: "eik" }
      )
      .select()
      .single();

    const { data: asset } = await supabase
      .from("production_assets")
      .upsert(
        {
          company_id: company!.id,
          asset_name: objectName,
          address,
          installed_capacity_kw: installedPower,
          technology_code: technology,
          energy_type: energyType,
        },
        { onConflict: "company_id,asset_name" }
      )
      .select()
      .single();

    await supabase.from("auer_guarantees_raw").insert({
      producer_name: producerName,
      producer_eik: eik,
      object_name: objectName,
      address,
      installed_power_kw: installedPower,
      technology,
      energy_type: energyType,
      support_scheme: supportScheme,
      produced_energy_mwh: producedEnergy,
      period_start: periodFrom,
      period_end: periodTo,
    });

    await supabase.from("guarantee_periods").insert({
      production_asset_id: asset!.id,
      period_start: periodFrom,
      period_end: periodTo,
      produced_energy_mwh: producedEnergy,
    });

    console.log(`Imported: ${producerName} | ${objectName}`);
  }

  console.log("IMPORT FINISHED");
}

run();
