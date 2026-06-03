```ts
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  const workbook = XLSX.readFile(
    "./data/Регистър издадени гаранции.xlsx"
  );

  const sheetName = workbook.SheetNames[0];

  const rows: any[] = XLSX.utils.sheet_to_json(
    workbook.Sheets[sheetName]
  );

  console.log("Total rows:", rows.length);

  for (const row of rows) {
    try {
      const producerName = row["Производител"];
      const eik = String(row["Булстат/ЕИК"] || "").trim();

      const objectName = row["Обект"];
      const address = row["Адрес"];

      const installedPower =
        Number(row["Инсталирана мощност"]) || 0;

      const technology = row["Технология"];
      const energyType = row["Вид енергия"];

      const producedEnergy =
        Number(row["Произв. енергия"]) || 0;

      const periodFrom = row["Период От"];
      const periodTo = row["Период До"];

      const supportScheme = row["Схеми за подпомагане"];

      // ---------------------------------------------------
      // 1. RAW TABLE
      // ---------------------------------------------------

      await supabase
        .from("auer_guarantees_raw")
        .insert({
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

      // ---------------------------------------------------
      // 2. COMPANY
      // ---------------------------------------------------

      let { data: company } = await supabase
        .from("companies")
        .select("*")
        .eq("eik", eik)
        .maybeSingle();

      if (!company) {
        const insertedCompany = await supabase
          .from("companies")
          .insert({
            name: producerName,
            eik,
            company_type: "producer",
          })
          .select()
          .single();

        company = insertedCompany.data;
      }

      // ---------------------------------------------------
      // 3. ASSET
      // ---------------------------------------------------

      let { data: asset } = await supabase
        .from("production_assets")
        .select("*")
        .eq("company_id", company.id)
        .eq("asset_name", objectName)
        .maybeSingle();

      if (!asset) {
        const insertedAsset = await supabase
          .from("production_assets")
          .insert({
            company_id: company.id,
            asset_name: objectName,
            address,
            installed_capacity_kw: installedPower,
            technology_code: technology,
            energy_type: energyType,
          })
          .select()
          .single();

        asset = insertedAsset.data;
      }

      // ---------------------------------------------------
      // 4. GUARANTEE PERIODS
      // ---------------------------------------------------

      await supabase
        .from("guarantee_periods")
        .insert({
          production_asset_id: asset.id,
          period_start: periodFrom,
          period_end: periodTo,
          produced_energy_mwh: producedEnergy,
        });

      console.log(
        `Imported: ${producerName} | ${objectName}`
      );

    } catch (err) {
      console.error("ERROR:", err);
    }
  }

  console.log("IMPORT FINISHED");
}

run();
```
