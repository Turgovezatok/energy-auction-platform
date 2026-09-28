"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import InfoTile from "@/components/confirm-auction/info-tile";
import OptionCard from "@/components/confirm-auction/option-card";
import LoadProfileUpload from "@/components/confirm-auction/load-profile-upload";
import EmailVerification from "@/components/confirm-auction/email-verification";
import CaptureSummary from "@/components/confirm-auction/capture-summary";

const PERIODS = [3, 6, 12, 24, 36];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function ConfirmAuctionPage() {
  const [invoice, setInvoice] = useState<any>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [months, setMonths] = useState(12);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [phone, setPhone] = useState("");
  const [deliveryStartDate, setDeliveryStartDate] = useState("");
  const [email, setEmail] = useState("");
  const [loadProfileFile, setLoadProfileFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  const [acceptsFixed, setAcceptsFixed] = useState(true);
  const [acceptsDayAhead, setAcceptsDayAhead] = useState(true);
  const [acceptsHybrid, setAcceptsHybrid] = useState(true);

  const [includeNetworkComponent, setIncludeNetworkComponent] = useState(true);
  const [hasBattery, setHasBattery] = useState(false);
  const [batteryCapacityKwh, setBatteryCapacityKwh] = useState("");

  const [worksSaturday, setWorksSaturday] = useState(true);
  const [worksSunday, setWorksSunday] = useState(true);

  useEffect(() => {
    async function loadData() {
      const params = new URLSearchParams(window.location.search);
      const invoiceId = params.get("invoiceId");
      const emailParam = params.get("email");

      if (emailParam) setEmail(emailParam);

      if (!invoiceId) {
        setLoadError("Липсва фактура. Започнете онбординга отначало.");
        return;
      }

      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoice_uploads")
        .select("*")
        .eq("id", invoiceId)
        .single();

      if (invoiceError || !invoiceData) {
        setLoadError("Не успяхме да заредим фактурата.");
        return;
      }

      let siteData: any[] = [];
      try {
        const res = await fetch(
          `/api/invoice-sites?invoiceId=${encodeURIComponent(invoiceId)}`
        );
        if (res.ok) siteData = (await res.json()).sites || [];
      } catch {
        siteData = [];
      }

      setInvoice(invoiceData);
      setSites(siteData);
    }

    loadData();
  }, []);

  if (loadError) {
    return (
      <div className="panel mx-auto max-w-xl text-center">
        <h1 className="text-lg font-semibold text-danger">{loadError}</h1>
        <Link href="/consumer-onboarding" className="btn btn-primary mx-auto mt-5 w-fit">
          Към онбординга
        </Link>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-3 text-white-dark">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-l-transparent" />
        Зареждане на фактурата...
      </div>
    );
  }

  const monthlyMwh =
    Number(invoice.total_consumption_mwh || 0) ||
    sites.reduce((sum, site) => sum + Number(site.consumption_mwh || 0), 0);

  const monthlyKwh = monthlyMwh * 1000;
  const estimatedContractKwh = monthlyKwh * months;
  const estimatedContractMwh = estimatedContractKwh / 1000;

  async function uploadLoadProfile(): Promise<string | null> {
    if (!loadProfileFile) return null;

    const safeName = loadProfileFile.name.replace(/[^\w.-]+/g, "_");
    const filePath = `load-profiles/${invoice.id}-${Date.now()}-${safeName}`;

    const { error } = await supabase.storage
      .from("invoice-files")
      .upload(filePath, loadProfileFile);

    if (error) throw new Error(`Качването на профила не успя: ${error.message}`);

    return supabase.storage.from("invoice-files").getPublicUrl(filePath).data
      .publicUrl;
  }

  async function createAuction() {
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !deliveryStartDate) {
      alert("Попълнете име, фамилия, телефон и начална дата.");
      return;
    }

    if (!emailVerified) {
      alert("Потвърдете имейла си, преди да публикувате търга.");
      return;
    }

    const contactName = `${firstName.trim()} ${lastName.trim()}`;

    if (!acceptsFixed && !acceptsDayAhead && !acceptsHybrid) {
      alert("Изберете поне един тип ценово предложение.");
      return;
    }

    if (hasBattery && !batteryCapacityKwh) {
      alert("Моля въведете капацитет на батерията в kWh.");
      return;
    }

    if (!estimatedContractKwh || estimatedContractKwh <= 0) {
      alert("Липсва потребление. Проверете извлечените данни.");
      return;
    }

    setCreating(true);

    try {
      const loadProfileUrl = await uploadLoadProfile();

      const auctionNumber =
        "CONS-" +
        new Date().toISOString().slice(0, 7).replace("-", "") +
        "-" +
        Math.floor(100000 + Math.random() * 900000);

      const offerDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      const pricingModels = [
        acceptsFixed ? "Фиксирана цена" : null,
        acceptsDayAhead ? "Фиксирана добавка към борсова цена" : null,
        acceptsHybrid ? "Фиксирана добавка + процент" : null,
      ]
        .filter(Boolean)
        .join(", ");

      const notes = [
        `Лице за контакт: ${contactName}`,
        `Телефон: ${phone}`,
        `Имейл: ${email}`,
        `Ценови модели: ${pricingModels}`,
        `Мрежови компоненти: ${includeNetworkComponent ? "да" : "не"}`,
        `Батерия: ${hasBattery ? `${batteryCapacityKwh} kWh` : "няма"}`,
        `Работа събота: ${worksSaturday ? "да" : "не"}`,
        `Работа неделя: ${worksSunday ? "да" : "не"}`,
        `Товаров профил: ${loadProfileUrl || "няма"}`,
        `Източник: фактура ${invoice.invoice_number || ""}`,
      ].join("; ");

      const { error } = await supabase.from("auctions").insert({
        board_type: "buy",
        title: `Търг за доставка - ${invoice.customer_name || "потребител"}`,
        sector: "Електроенергия",
        activity_type: "consumer",
        delivery_start: deliveryStartDate,
        offer_deadline: offerDeadline,
        duration_months: months,
        quantity_mwh: Number(estimatedContractMwh.toFixed(3)),
        has_invoice: true,
        network_component: includeNetworkComponent,
        has_battery: hasBattery,
        battery_capacity_kwh: hasBattery ? Number(batteryCapacityKwh) : null,
        works_saturday: worksSaturday,
        works_sunday: worksSunday,
        contract_type: "open",
        accepts_fixed: acceptsFixed,
        accepts_day_ahead: acceptsDayAhead,
        accepts_hybrid: acceptsHybrid,
        notes,
        status: "active",
        customer_type: "customer",
        auction_number: auctionNumber,
        source_invoice_id: invoice.id,
        current_supplier: invoice.supplier_name || null,
      });

      if (error) throw new Error(error.message);

      alert("Търгът е създаден успешно.");
      window.location.href = "/my-auctions";
    } catch (error) {
      alert(
        "Грешка при създаване на търг:\n\n" +
          (error instanceof Error ? error.message : String(error))
      );
      setCreating(false);
    }
  }

  return (
    <div>
      <ul className="flex space-x-2 rtl:space-x-reverse">
        <li>
          <Link href="/dashboard" className="text-primary hover:underline">
            Табло
          </Link>
        </li>
        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
          <span>Потвърждение на търг</span>
        </li>
      </ul>

      <div className="mt-5 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          <div className="panel">
            <div className="mb-5">
              <h1 className="text-lg font-semibold dark:text-white-light">
                Извлечени данни от фактурата
              </h1>
              <p className="mt-1 text-white-dark">
                Проверете данните, допълнете контакт и изберете условията на търга.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <InfoTile label="Фирма" value={invoice.customer_name} />
              <InfoTile label="ЕИК" value={invoice.customer_eik} />
              <InfoTile label="Доставчик" value={invoice.supplier_name} />
              <InfoTile label="Фактура №" value={invoice.invoice_number} />
              <InfoTile label="Период" value={invoice.reporting_period} />
              <InfoTile
                label="Месечно потребление"
                value={`${monthlyKwh.toLocaleString("bg-BG", { maximumFractionDigits: 0 })} kWh`}
              />
            </div>
          </div>

          <div className="panel">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold dark:text-white-light">Обекти / ИТН</h2>
              <span className="badge bg-primary">{sites.length}</span>
            </div>
            {sites.length === 0 ? (
              <p className="text-white-dark">Няма извлечени обекти.</p>
            ) : (
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>ИТН</th>
                      <th>Адрес</th>
                      <th className="text-right">Консумация</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sites.map((site) => (
                      <tr key={site.id}>
                        <td className="whitespace-nowrap font-semibold">{site.itn || "—"}</td>
                        <td>{site.address || "—"}</td>
                        <td className="whitespace-nowrap text-right">
                          {Number(site.consumption_mwh || 0).toFixed(3)} MWh
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="panel">
            <h2 className="mb-5 text-lg font-semibold dark:text-white-light">Контакт и доставка</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName">
                  Име <span className="text-danger">*</span>
                </label>
                <input
                  id="firstName"
                  className="form-input"
                  autoComplete="given-name"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="lastName">
                  Фамилия <span className="text-danger">*</span>
                </label>
                <input
                  id="lastName"
                  className="form-input"
                  autoComplete="family-name"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="phone">
                  Телефон <span className="text-danger">*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  className="form-input"
                  placeholder="+359 ..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="email">
                  Имейл <span className="text-danger">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="form-input disabled:cursor-not-allowed disabled:bg-[#eee] dark:disabled:bg-[#1b2e4b]"
                  value={email}
                  disabled={emailVerified}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="deliveryStart">
                  Начална дата на доставка <span className="text-danger">*</span>
                </label>
                <input
                  id="deliveryStart"
                  type="date"
                  className="form-input"
                  min={todayIso()}
                  value={deliveryStartDate}
                  onChange={(e) => setDeliveryStartDate(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <EmailVerification email={email} onVerifiedChange={setEmailVerified} />
              </div>
              <div className="sm:col-span-2">
                <LoadProfileUpload file={loadProfileFile} onChange={setLoadProfileFile} />
              </div>
            </div>
          </div>

          <div className="panel">
            <h2 className="mb-5 text-lg font-semibold dark:text-white-light">Условия на търга</h2>

            <div className="mb-6">
              <label>Период на търга</label>
              <div className="flex flex-wrap gap-2">
                {PERIODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMonths(m)}
                    aria-pressed={months === m}
                    className={`btn ${months === m ? "btn-primary" : "btn-outline-primary"}`}
                  >
                    {m} месеца
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label>Какъв тип цена търсите?</label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <OptionCard
                  title="Фиксирана цена"
                  description="Крайна цена за MWh за целия период."
                  checked={acceptsFixed}
                  onChange={setAcceptsFixed}
                />
                <OptionCard
                  title="Добавка към борсова цена"
                  description="Борсова цена + фиксирана надбавка."
                  checked={acceptsDayAhead}
                  onChange={setAcceptsDayAhead}
                />
                <OptionCard
                  title="Добавка + процент"
                  description="Борсова цена + фиксирана надбавка + процент."
                  checked={acceptsHybrid}
                  onChange={setAcceptsHybrid}
                />
              </div>
            </div>

            <div className="mb-6">
              <label>Работни дни</label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <OptionCard
                  title="Работим в събота"
                  description="Обектът има нормално потребление и в събота."
                  checked={worksSaturday}
                  onChange={setWorksSaturday}
                />
                <OptionCard
                  title="Работим в неделя"
                  description="Обектът има нормално потребление и в неделя."
                  checked={worksSunday}
                  onChange={setWorksSunday}
                />
              </div>
            </div>

            <div>
              <label>Мрежови компоненти и батерия</label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <OptionCard
                  title="Включване на мрежови компоненти"
                  description="Търговците да включат мрежовите компоненти в офертата."
                  checked={includeNetworkComponent}
                  onChange={setIncludeNetworkComponent}
                />
                <OptionCard
                  title="Имам батерия"
                  description="Посочете, ако обектът разполага с батерия."
                  checked={hasBattery}
                  onChange={setHasBattery}
                />
              </div>
              {hasBattery && (
                <div className="mt-4 md:w-1/2">
                  <label htmlFor="battery">Капацитет на батерията, kWh</label>
                  <input
                    id="battery"
                    type="number"
                    min="0"
                    className="form-input"
                    value={batteryCapacityKwh}
                    onChange={(e) => setBatteryCapacityKwh(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="xl:col-span-1">
          <div className="panel xl:sticky xl:top-24">
            <h2 className="mb-5 text-lg font-semibold dark:text-white-light">Обобщение</h2>
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-white-dark">Месечно количество</dt>
                <dd className="font-semibold">
                  {monthlyKwh.toLocaleString("bg-BG", { maximumFractionDigits: 0 })} kWh
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-white-dark">Период</dt>
                <dd className="font-semibold">{months} месеца</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-white-dark">Начална дата</dt>
                <dd className="font-semibold">{deliveryStartDate || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-white-dark">Товаров профил</dt>
                <dd className="font-semibold">{loadProfileFile ? "приложен" : "няма"}</dd>
              </div>
            </dl>

            <div className="mt-5 rounded-md bg-primary-light p-4 dark:bg-primary-dark-light">
              <div className="text-xs text-white-dark">Очаквано количество за търга</div>
              <div className="mt-1 text-2xl font-bold text-primary">
                {estimatedContractKwh.toLocaleString("bg-BG", { maximumFractionDigits: 0 })} kWh
              </div>
            </div>

            <CaptureSummary
              invoiceId={invoice.id}
              file={loadProfileFile}
              worksSaturday={worksSaturday}
              worksSunday={worksSunday}
              monthlyMwh={monthlyMwh}
            />

            <button
              type="button"
              onClick={createAuction}
              disabled={creating || !emailVerified}
              aria-describedby={emailVerified ? undefined : "verify-hint"}
              className="btn btn-primary mt-5 w-full"
            >
              {creating ? "Създаваме търг..." : "Създай търг"}
            </button>
            {!emailVerified && (
              <p id="verify-hint" className="mt-2 text-center text-xs text-white-dark">
                Бутонът се активира след потвърждение на имейла.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
