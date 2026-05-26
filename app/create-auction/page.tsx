"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function CreateAuctionPage() {
  const [message, setMessage] = useState("");
  const [customerType, setCustomerType] = useState("customer");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    const deliveryStartDate = String(
      formData.get("delivery_start_date") || ""
    );

    if (!deliveryStartDate) {
      setMessage("Моля въведи начална дата.");
      return;
    }

    const dayOfMonth = new Date(deliveryStartDate).getDate();
    if (dayOfMonth !== 1) {
  setMessage(
    "Началната дата на доставка трябва да бъде първо число на месеца."
  );
  return;
}const now = new Date();

const year = now.getFullYear();

const month = String(
  now.getMonth() + 1
).padStart(2, "0");

const randomNumber = Math.floor(
  100000 + Math.random() * 900000
);

let prefix = "CONS";

if (customerType === "prosumer") {
  prefix = "PROSUMER";
}

if (formData.get("board_type") === "sell") {
  prefix = "PROD";
}

const auctionNumber =
  `${prefix}-${year}${month}-${randomNumber}`;

    if (dayOfMonth !== 1) {
      setMessage(
        "Началната дата на доставка трябва да бъде първо число на месеца."
      );
      return;
    }

   const { error } = await supabase.from("auctions").insert({
  auction_number: auctionNumber,

  board_type: formData.get("board_type"),

      title: formData.get("title"),

      sector: formData.get("sector"),

      customer_type: customerType,

      annual_consumption_mwh:
        Number(formData.get("annual_consumption_mwh")) || null,

      duration_months:
        Number(formData.get("duration_months")) || null,

      contract_type: formData.get("contract_type"),

      preferred_payment_days:
        Number(formData.get("preferred_payment_days")) || null,

      delivery_start_date: deliveryStartDate,

      offer_deadline_date: formData.get("offer_deadline_date"),

      has_pv: customerType === "prosumer",

      pv_capacity_kwp:
        Number(formData.get("pv_capacity_kwp")) || null,

      has_surplus: customerType === "prosumer",

      surplus_mwh:
        Number(formData.get("surplus_mwh")) || null,

      network_components_included:
        formData.get("network_components_included") === "on",

      accepts_fixed_price:
        formData.get("accepts_fixed_price") === "on",

      accepts_day_ahead_with_balancing:
        formData.get(
          "accepts_day_ahead_with_balancing"
        ) === "on",

      accepts_day_ahead_without_balancing:
        formData.get(
          "accepts_day_ahead_without_balancing"
        ) === "on",

      accepts_hybrid:
        formData.get("accepts_hybrid") === "on",

      notes: formData.get("notes"),
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Търгът е публикуван успешно ✅");

    e.currentTarget.reset();

    setCustomerType("customer");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f1f5f9",
        padding: 40,
        fontFamily: "Arial",
      }}
    >
      <div
        style={{
          maxWidth: 920,
          margin: "0 auto",
          background: "white",
          padding: 40,
          borderRadius: 24,
        }}
      >
        <h1
          style={{
            fontSize: 42,
            fontWeight: 800,
            marginBottom: 10,
          }}
        >
          Създай търг
        </h1>

        <p
          style={{
            color: "#64748b",
            marginBottom: 30,
          }}
        >
          Публикуване на заявка за доставка или продажба
          на електроенергия
        </p>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gap: 22,
          }}
        >
          <div>
            <label>Тип търг</label>

            <select
              name="board_type"
              required
              style={inputStyle}
            >
              <option value="buy">Купува</option>
              <option value="sell">Продава</option>
            </select>
          </div>

          <div>
            <label>Заглавие</label>

            <input
              name="title"
              required
              placeholder="Например: Доставка за производствена база"
              style={inputStyle}
            />
          </div>

          <div>
            <label>Вид дейност</label>

            <select
              name="sector"
              style={inputStyle}
            >
              <option>Болница</option>
              <option>Аптека</option>
              <option>Производство</option>
              <option>Хотел</option>
              <option>Retail</option>
              <option>Data Center</option>
              <option>Просюмър</option>
              <option>Друг</option>
            </select>
          </div>

          <div>
            <label>Тип клиент</label>

            <select
              value={customerType}
              onChange={(e) =>
                setCustomerType(e.target.value)
              }
              style={inputStyle}
            >
              <option value="customer">
                Потребител
              </option>

              <option value="prosumer">
                Просюмър / клиент с ФЕЦ
              </option>
            </select>
          </div>

          <div>
            <label>
              Годишна консумация (MWh)
            </label>

            <input
              type="number"
              name="annual_consumption_mwh"
              style={inputStyle}
            />
          </div>

          {customerType === "prosumer" && (
            <>
              <div>
                <label>
                  Мощност на ФЕЦ (kWp)
                </label>

                <input
                  type="number"
                  name="pv_capacity_kwp"
                  style={inputStyle}
                />
              </div>

              <div>
                <label>
                  Очакван годишен излишък (MWh)
                </label>

                <input
                  type="number"
                  name="surplus_mwh"
                  style={inputStyle}
                />
              </div>
            </>
          )}

          <div>
            <label>Срок на договора</label>

            <select
              name="duration_months"
              style={inputStyle}
            >
              <option value="3">
                3 месеца
              </option>

              <option value="6">
                6 месеца
              </option>

              <option value="12">
                12 месеца
              </option>

              <option value="24">
                24 месеца
              </option>

              <option value="36">
                36 месеца
              </option>
            </select>
          </div>

          <div>
            <label>Тип договор</label>

            <select
              name="contract_type"
              style={inputStyle}
            >
              <option value="open">
                Отворен
              </option>

              <option value="closed">
                Затворен
              </option>
            </select>
          </div>

          <div>
            <label>Срок за плащане</label>

            <select
              name="preferred_payment_days"
              style={inputStyle}
            >
              <option value="10">
                10 дни
              </option>

              <option value="15">
                15 дни
              </option>

              <option value="30">
                30 дни
              </option>

              <option value="45">
                45 дни
              </option>
            </select>
          </div>

          <div>
            <label>
              Начална дата на доставка
            </label>

            <input
              type="date"
              name="delivery_start_date"
              required
              style={inputStyle}
            />

            <small
              style={{
                color: "#64748b",
              }}
            >
              Доставката може да започва само
              от първо число на месеца.
            </small>
          </div>

          <div>
            <label>
              Краен срок за оферти
            </label>

            <input
              type="date"
              name="offer_deadline_date"
              style={inputStyle}
            />
          </div>

          <label>
            <input
              type="checkbox"
              name="network_components_included"
            />{" "}
            С включени мрежови компоненти
          </label>

          <div>
            <strong>
              Приемани ценови модели
            </strong>

            <div
              style={{
                marginTop: 12,
              }}
            >
              <label>
                <input
                  type="checkbox"
                  name="accepts_fixed_price"
                  defaultChecked
                />{" "}
                Фиксирана цена
              </label>
            </div>

            <div>
              <label>
                <input
                  type="checkbox"
                  name="accepts_day_ahead_with_balancing"
                  defaultChecked
                />{" "}
                Ден напред с балансиране
              </label>
            </div>

            <div>
              <label>
                <input
                  type="checkbox"
                  name="accepts_day_ahead_without_balancing"
                  defaultChecked
                />{" "}
                Ден напред без балансиране
              </label>
            </div>

            <div>
              <label>
                <input
                  type="checkbox"
                  name="accepts_hybrid"
                  defaultChecked
                />{" "}
                Двукомпонентна добавка
              </label>
            </div>
          </div>

          <div>
            <label>Бележки</label>

            <textarea
              name="notes"
              rows={5}
              style={textareaStyle}
            />
          </div>

          <button
            type="submit"
            style={buttonStyle}
          >
            Публикувай търг
          </button>

          {message && (
            <div style={messageStyle}>
              {message}
            </div>
          )}
        </form>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 14,
  marginTop: 8,
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  padding: 14,
  marginTop: 8,
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  minHeight: 140,
  boxSizing: "border-box",
};

const buttonStyle: React.CSSProperties = {
  padding: 16,
  border: 0,
  borderRadius: 14,
  background: "#059669",
  color: "white",
  fontSize: 18,
  fontWeight: 700,
  cursor: "pointer",
};

const messageStyle: React.CSSProperties = {
  padding: 16,
  borderRadius: 14,
  background: "#dcfce7",
  color: "#166534",
  fontWeight: 700,
};
