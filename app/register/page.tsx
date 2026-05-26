"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function RegisterPage() {
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");

  const [invoiceFile, setInvoiceFile] =
    useState<File | null>(null);

  const [message, setMessage] = useState("");

  async function handleRegister(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (
      (role === "customer" ||
        role === "prosumer") &&
      !invoiceFile
    ) {
      setMessage(
        "Моля качете подробна фактура PDF."
      );
      return;
    }

    setMessage("Създаване на акаунт...");

    const { data, error } =
      await supabase.auth.signUp({
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

    let invoiceUrl = null;

    if (
      invoiceFile &&
      data.user
    ) {
      const fileName =
        `${data.user.id}-${Date.now()}.pdf`;

      const { error: uploadError } =
        await supabase.storage
          .from("invoice-files")
          .upload(
            fileName,
            invoiceFile
          );

      if (uploadError) {
        setMessage(
          "Грешка при качване на фактура."
        );
        return;
      }

      const { data: publicUrlData } =
        supabase.storage
          .from("invoice-files")
          .getPublicUrl(fileName);

      invoiceUrl =
        publicUrlData.publicUrl;

      await supabase
        .from("invoice_uploads")
        .insert({
          uploaded_by: data.user.id,
          file_url: invoiceUrl,
        });
    }

    setMessage(
      "Акаунтът е създаден успешно ✅"
    );
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
        padding: 40,
      }}
    >
      <form
        onSubmit={handleRegister}
        style={{
          width: 520,
          background: "white",
          padding: 36,
          borderRadius: 24,
          boxShadow:
            "0 20px 60px rgba(15,23,42,0.12)",
        }}
      >
        <h1>Регистрация</h1>

        <p
          style={{
            color: "#64748b",
            marginBottom: 24,
          }}
        >
          Създайте профил в EnergyBid.
        </p>

        <label>Фирма</label>

        <input
          value={company}
          onChange={(e) =>
            setCompany(e.target.value)
          }
          required
          style={inputStyle}
        />

        <label>Имейл</label>

        <input
          type="email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          required
          style={inputStyle}
        />

        <label>Парола</label>

        <input
          type="password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          required
          style={inputStyle}
        />

        <label>Тип акаунт</label>

        <select
          value={role}
          onChange={(e) =>
            setRole(e.target.value)
          }
          style={inputStyle}
        >
          <option value="customer">
            Потребител
          </option>

          <option value="prosumer">
            Просюмър
          </option>

          <option value="trader">
            Търговец
          </option>

          <option value="producer">
            Производител
          </option>
        </select>

        {(role === "customer" ||
          role === "prosumer") && (
          <>
            <label>
              Качи подробна фактура
              (PDF)
            </label>

            <input
              type="file"
              accept="application/pdf"
              required
              onChange={(e) =>
                setInvoiceFile(
                  e.target.files?.[0] ||
                    null
                )
              }
              style={{
                marginTop: 12,
                marginBottom: 24,
              }}
            />

            <div
              style={{
                background: "#f1f5f9",
                padding: 16,
                borderRadius: 14,
                marginBottom: 24,
                color: "#334155",
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              Качената фактура ще
              бъде използвана за:
              <br />
              • автоматично
              разпознаване на
              профила
              <br />
              • анализ на
              потреблението
              <br />
              • генериране на
              търг
              <br />• сравнение на
              оферти
            </div>
          </>
        )}

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
            cursor: "pointer",
          }}
        >
          Създай акаунт
        </button>

        {message && (
          <p
            style={{
              marginTop: 18,
              fontWeight: 700,
            }}
          >
            {message}
          </p>
        )}
      </form>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 14,
  margin: "8px 0 18px",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  boxSizing: "border-box",
};
