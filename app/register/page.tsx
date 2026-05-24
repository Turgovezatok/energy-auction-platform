"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function RegisterPage() {
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");
  const [message, setMessage] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    setMessage("Създаване на акаунт...");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          company_name: company,
          role: role,
        },
      },
    });

    if (error) {
      setMessage("Грешка: " + error.message);
      return;
    }

    setMessage("Акаунтът е създаден успешно ✅");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f8fafc",
        fontFamily: "Arial",
      }}
    >
      <form
        onSubmit={handleRegister}
        style={{
          width: 460,
          background: "white",
          padding: 36,
          borderRadius: 24,
          boxShadow: "0 20px 60px rgba(15,23,42,0.12)",
        }}
      >
        <h1>Регистрация</h1>

        <p style={{ color: "#64748b", marginBottom: 24 }}>
          Създайте профил в EnergyBid.
        </p>

        <label>Фирма</label>
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          required
          style={{
            width: "100%",
            padding: 14,
            margin: "8px 0 18px",
            borderRadius: 12,
            border: "1px solid #cbd5e1",
          }}
        />

        <label>Имейл</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            width: "100%",
            padding: 14,
            margin: "8px 0 18px",
            borderRadius: 12,
            border: "1px solid #cbd5e1",
          }}
        />

        <label>Парола</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            width: "100%",
            padding: 14,
            margin: "8px 0 18px",
            borderRadius: 12,
            border: "1px solid #cbd5e1",
          }}
        />

        <label>Тип акаунт</label>

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={{
            width: "100%",
            padding: 14,
            margin: "8px 0 24px",
            borderRadius: 12,
            border: "1px solid #cbd5e1",
          }}
        >
          <option value="customer">Потребител</option>
          <option value="trader">Търговец</option>
          <option value="producer">Производител</option>
        </select>

        <button
          type="submit"
          style={{
            width: "100%",
            padding: 15,
            borderRadius: 14,
            border: 0,
            background: "#059669",
            color: "white",
            fontSize: 17,
            fontWeight: 700,
          }}
        >
          Създай акаунт
        </button>

        {message && (
          <p style={{ marginTop: 18 }}>
            {message}
          </p>
        )}
      </form>
    </main>
  );
}
