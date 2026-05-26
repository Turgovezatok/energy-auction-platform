"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function CreateAuctionPage() {
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const deliveryStartDate = String(formData.get("delivery_start_date") || "");

    if (!deliveryStartDate) {
      setMessage("Моля въведи начална дата на доставка.");
      return;
    }

    const dayOfMonth = new Date(deliveryStartDate).getDate();

    if (dayOfMonth !== 1) {
      setMessage("Началната дата на доставка трябва да бъде първо число на месеца.");
      return;
    }

    const { error } = await supabase.from("auctions").insert({
      board_type: formData.get("board_type"),
      title: formData.get("title"),
      sector: formData.get("sector"),
      annual_consumption_mwh: Number(formData.get("annual_consumption_mwh")),
      duration_months: Number(formData.get("duration_months")),
      contract_type: formData.get("contract_type"),
      preferred_payment_days: Number(formData.get("preferred_payment_days")),
      delivery_start_date: deliveryStartDate,
      offer_deadline_date: formData.get("offer_deadline_date"),
      has_pv: formData.get("has_pv") === "on",
      network_components_included:
        formData.get("network_components_included") === "on",
      accepts_fixed_price: formData.get("accepts_fixed_price") === "on",
      accepts_day_ahead_with_balancing:
        formData.get("accepts_day_ahead_with_balancing") === "on",
      accepts_day_ahead_without_balancing:
        formData.get("accepts_day_ahead_without_balancing") === "on",
      accepts_hybrid: formData.get("accepts_hybrid") === "on",
      notes: formData.get("notes"),
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Търгът е създаден успешно ✅");
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f1f5f9", padding: 40, fontFamily: "Arial" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", background: "white", padding: 40, borderRadius: 24 }}>
        <h1>Създай търг</h1>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 20, marginTop: 30 }}>
          <div>
            <label>Тип</label>
            <select name="board_type" required style={inputStyle}>
              <option value="buy">Купува</option>
              <option value="sell">Продава</option>
            </select>
          </div>

          <div>
            <label>Заглавие</label>
            <input name="title" required style={inputStyle} />
          </div>

          <div>
            <label>Вид дейност</label>
            <select name="sector" style={inputStyle}>
              <option>Болница</option>
              <option>Аптека</option>
              <option>Производство</option>
              <option>Хотел</option>
              <option>Retail</option>
              <option>Data Center</option>
              <option>Друг</option>
            </select>
          </div>

          <div>
            <label>Годишна консумация (MWh)</label>
            <input type="number" name="annual_consumption_mwh" style={inputStyle} />
          </div>

          <div>
            <label>Срок на договора</label>
            <select name="duration_months" style={inputStyle}>
              <option value="3">3 месеца</option>
              <option value="6">6 месеца</option>
              <option value="12">12 месеца</option>
              <option value="24">24 месеца</option>
              <option value="36">36 месеца</option>
            </select>
          </div>

          <div>
            <label>Тип договор</label>
            <select name="contract_type" style={inputStyle}>
              <option value="open">Отворен</option>
              <option value="closed">Затворен</option>
            </select>
          </div>

          <div>
            <label>Срок за плащане</label>
            <select name="preferred_payment_days" style={inputStyle}>
              <option value="10">10 дни</option>
              <option value="15">15 дни</option>
              <option value="30">30 дни</option>
              <option value="45">45 дни</option>
            </select>
          </div>

          <div>
            <label>Начална дата на доставка</label>
            <input type="date" name="delivery_start_date" required style={inputStyle} />
            <small style={{ color: "#64748b" }}>
              Доставката може да започва само от първо число на месеца.
            </small>
          </div>

          <div>
            <label>Краен срок за оферти</label>
            <input type="date" name="offer_deadline_date" style={inputStyle} />
          </div>

          <label>
            <input type="checkbox" name="has_pv" /> Има ФЕЦ
          </label>

          <label>
            <input type="checkbox" name="network_components_included" /> С включени мрежови компоненти
          </label>

          <div>
            <strong>Приемани ценови модели</strong>

            <div style={{ marginTop: 12 }}>
              <label>
                <input type="checkbox" name="accepts_fixed_price" defaultChecked /> Фиксирана цена
              </label>
            </div>

            <div>
              <label>
                <input type="checkbox" name="accepts_day_ahead_with_balancing" defaultChecked /> Ден напред + добавка с балансиране
              </label>
            </div>

            <div>
              <label>
                <input type="checkbox" name="accepts_day_ahead_without_balancing" defaultChecked /> Ден напред + добавка без балансиране
              </label>
            </div>

            <div>
              <label>
                <input type="checkbox" name="accepts_hybrid" defaultChecked /> Хибриден модел
              </label>
            </div>
          </div>

          <div>
            <label>Бележки</label>
            <textarea name="notes" rows={5} style={inputStyle} />
          </div>

          <button
            type="submit"
            style={{
              padding: 16,
              border: 0,
              borderRadius: 14,
              background: "#059669",
              color: "white",
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            Публикувай търг
          </button>

          {message && <p>{message}</p>}
        </form>
      </div>
    </main>
  );
}

const inputStyle = {
  width: "100%",
  padding: 14,
  marginTop: 8,
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  boxSizing: "border-box" as const,
};
