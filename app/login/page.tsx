"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMessage("Влизане...");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage("Грешка: " + error.message);
      return;
    }

    setMessage("Успешен вход ✅");
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", fontFamily: "Arial" }}>
      <form onSubmit={handleLogin} style={{ width: 420, background: "white", padding: 36, borderRadius: 24, boxShadow: "0 20px 60px rgba(15,23,42,0.12)" }}>
        <h1 style={{ marginTop: 0 }}>Вход</h1>
        <p style={{ color: "#64748b" }}>Влезте в EnergyBid платформата.</p>

        <label>Имейл</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required style={{ width: "100%", padding: 14, margin: "8px 0 18px", borderRadius: 12, border: "1px solid #cbd5e1" }} />

        <label>Парола</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required style={{ width: "100%", padding: 14, margin: "8px 0 22px", borderRadius: 12, border: "1px solid #cbd5e1" }} />

        <button type="submit" style={{ width: "100%", padding: 15, borderRadius: 14, border: 0, background: "#059669", color: "white", fontSize: 17, fontWeight: 700 }}>
          Вход
        </button>

        {message && <p style={{ marginTop: 18 }}>{message}</p>}
      </form>
    </main>
  );
}
