import { APICallError, generateText, Output } from "ai";
import { z } from "zod";

export const INVOICE_MODEL = "google/gemini-2.5-flash";

const MAX_PDF_BYTES = 20 * 1024 * 1024;

const nullableText = z.string().nullable();
const nullableNumber = z.number().nullable();

const tariffZoneSchema = z.object({
  zone_name: nullableText.describe("Име на тарифната зона, напр. Дневна, Нощна, Върхова"),
  tariff_code: nullableText,
  consumption_kwh: nullableNumber.describe("Консумация в kWh за зоната"),
});

const siteSchema = z.object({
  itn: nullableText.describe("ИТН / идентификационен номер на точката, напр. 32Z140000049610F"),
  meter_number: nullableText,
  address: nullableText,
  site_name: nullableText,
  distribution_operator: nullableText.describe("Мрежови оператор (ЕРП), не доставчикът"),
  consumption_MWh: nullableNumber,
  energy_price_EUR_MWh: nullableNumber,
  tariff_zones: z.array(tariffZoneSchema),
});

export const invoiceSchema = z.object({
  invoice_number: nullableText,
  company_name: nullableText.describe("Клиентът / получателят на фактурата, НИКОГА доставчикът"),
  EIK: nullableText,
  VAT_number: nullableText,
  client_number: nullableText,
  reporting_period: nullableText.describe("Отчетен период точно както е във фактурата, напр. 01.04.2026 - 30.04.2026"),
  supplier_name: nullableText.describe("Доставчикът / издателят на фактурата"),
  total_consumption_MWh: nullableNumber,
  energy_price_EUR_MWh: nullableNumber,
  paid_energy_total: nullableNumber.describe("Стойност само на активната енергия, без ДДС, мрежови такси и акциз"),
  paid_energy_price: nullableNumber.describe("Единична цена на активната енергия"),
  paid_energy_currency: nullableText.describe("Валута, обикновено BGN или EUR"),
  total_energy_kwh: nullableNumber.describe("Общо количество активна енергия в kWh"),
  sites: z.array(siteSchema).describe("ВСИЧКИ обекти / ИТН във фактурата"),
});

export type ExtractedInvoice = z.infer<typeof invoiceSchema>;

const SYSTEM_PROMPT = `Извличаш структурирани данни от българска фактура за електроенергия (PDF).

Правила:
- Не измисляй данни. Ако поле не се вижда във фактурата, върни null.
- Използвай само стойности, изрично показани във фактурата.
- supplier_name = доставчик / издател на фактурата. company_name = клиент / получател. Никога не слагай доставчика като company_name.
- Числата връщай като числа (десетична точка), без разделители за хиляди и без мерни единици.
- За активната енергия използвай обобщения ред в началото на фактурата, когато го има. Търси "Активна енергия за периода", "Активна енергия", "Ел. енергия", "Електрическа енергия".
- Не използвай общата сума, ДДС, мрежови такси, акциз или крайната сума за плащане като paid_energy_total.
- Извлечи ВСИЧКИ обекти / ИТН, включително от приложенията и таблиците по обекти.`;

export class InvoiceServiceBusyError extends Error {}

export const BUSY_MESSAGE =
  "Услугата за обработка на фактури е временно претоварена. Моля, опитайте отново след минута.";

async function downloadPdf(fileUrl: string): Promise<Uint8Array> {
  const response = await fetch(fileUrl, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) {
    throw new Error(`Файлът с фактурата не може да бъде изтеглен (HTTP ${response.status}).`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_PDF_BYTES) {
    throw new Error("Файлът е твърде голям (максимум 20 MB).");
  }
  return bytes;
}

export async function extractInvoiceFromPdf(fileUrl: string): Promise<ExtractedInvoice> {
  const pdf = await downloadPdf(fileUrl);

  try {
    const { output } = await generateText({
      model: INVOICE_MODEL,
      system: SYSTEM_PROMPT,
      output: Output.object({ schema: invoiceSchema }),
      temperature: 0,
      maxRetries: 3,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Извлечи данните от тази фактура за електроенергия." },
            { type: "file", data: pdf, mediaType: "application/pdf", filename: "invoice.pdf" },
          ],
        },
      ],
    });
    return output;
  } catch (error) {
    if (APICallError.isInstance(error) && error.statusCode === 429) {
      throw new InvoiceServiceBusyError(BUSY_MESSAGE);
    }
    throw error;
  }
}
