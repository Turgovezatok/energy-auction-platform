"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function ConsumerOnboardingPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [showExample, setShowExample] = useState(false);

  async function submit() {
    if (!email || !invoiceFile) {
      alert("Въведете имейл и качете PDF фактура.");
      return;
    }

    setLoading(true);

    try {
      const filePath = `consumer-invoices/${Date.now()}-${invoiceFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from("invoice-files")
        .upload(filePath, invoiceFile);

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: publicUrlData } = supabase.storage
        .from("invoice-files")
        .getPublicUrl(filePath);

      const fileUrl = publicUrlData.publicUrl;

      const { data: insertedInvoice, error: insertError } =
        await supabase
          .from("invoice_uploads")
          .insert({
            file_url: fileUrl,
            extraction_status: "pending",
          })
          .select()
          .single();

      if (insertError || !insertedInvoice) {
        throw new Error(
          insertError?.message ||
            "Invoice insert failed"
        );
      }

      const extractionResponse = await fetch(
        "/api/extract-invoice",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            fileUrl,
          }),
        }
      );

      const extractionResult =
        await extractionResponse.json();

      if (
        !extractionResponse.ok ||
        extractionResult.error
      ) {
        throw new Error(
          extractionResult.error ||
            "Extraction failed"
        );
      }

      setTimeout(() => {
        router.push(
          `/confirm-auction?invoiceId=${insertedInvoice.id}&email=${encodeURIComponent(
            email
          )}`
        );
      }, 1200);
    } catch (error) {
      alert(
        "Грешка:\n\n" +
          (error instanceof Error
            ? error.message
            : String(error))
      );

      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: 40,
        fontFamily: "Arial",
      }}
    >
      <div
        style={{
          maxWidth: 820,
          margin: "0 auto",
          background: "white",
          padding: 36,
          borderRadius: 24,
          boxShadow:
            "0 14px 40px rgba(15,23,42,0.08)",
        }}
      >
        <h1>
          Потребител без централа
        </h1>

        <p
          style={{
            color: "#334155",
            marginBottom: 28,
            fontSize: 19,
            lineHeight: 1.7,
            fontWeight: 600,
          }}
        >
          Прикачете последна фактура
          от настоящия Ви доставчик.
          От нея ще направим
          калкулации и ще Ви
          предложим
          най-подходящите за Вас
          условия.
        </p>

        <input
          placeholder="Имейл за контакт"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          style={{
            width: "100%",
            padding: 14,
            marginTop: 16,
            borderRadius: 12,
            border:
              "1px solid #cbd5e1",
            fontSize: 16,
          }}
        />

        <div
          style={{
            marginTop: 28,
            marginBottom: 30,
            padding: 22,
            borderRadius: 18,
            background: "#f1f5f9",
            border:
              "1px solid #cbd5e1",
          }}
        >
          <button
            type="button"
            onClick={() =>
              setShowExample(true)
            }
            style={{
              marginBottom: 20,
              padding: "10px 14px",
              borderRadius: 12,
              border:
                "1px solid #059669",
              background: "white",
              color: "#059669",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Виж пример каква
            фактура ни трябва
          </button>

          <label>
            <strong>
              Качете PDF фактура *
            </strong>
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
              display: "block",
              marginTop: 14,
            }}
          />
        </div>

        <button
          onClick={submit}
          disabled={loading}
          style={{
            padding: "14px 24px",
            borderRadius: 14,
            border: 0,
            background: "#059669",
            color: "white",
            fontWeight: 700,
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          {loading
            ? "Обработва..."
            : "Продължи"}
        </button>
      </div>

      {showExample && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(15,23,42,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent:
              "center",
            zIndex: 100,
            padding: 24,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 24,
              padding: 28,
              maxWidth: 920,
              width: "100%",
              boxShadow:
                "0 30px 80px rgba(15,23,42,0.35)",
            }}
          >
            <h2>
              Каква информация
              търсим във
              фактурата?
            </h2>

            <p
              style={{
                color: "#475569",
                lineHeight: 1.6,
              }}
            >
              Във фактурата трябва
              да има ИТН обект,
              електромер и
              консумация по
              тарифи.
            </p>

            <div
              style={{
                marginTop: 18,
                padding: 18,
                borderRadius: 16,
                background:
                  "#f8fafc",
                border:
                  "1px solid #e2e8f0",
                overflowX: "auto",
                fontFamily:
                  "monospace",
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              <div>
                <strong>
                  Обект ИТН №
                  1234567
                </strong>
              </div>

              <div>
                Място на
                потребление:
                ГР. XXXXX,
                УЛ. XXXXX № XX
              </div>

              <div>
                Наименование:
                ПРИМЕРНА ФИРМА
                ООД
              </div>

              <div>
                Отчетен период:
                01.02.2025 -
                28.02.2025
              </div>

              <br />

              <table
                style={{
                  width: "100%",
                  borderCollapse:
                    "collapse",
                }}
              >
                <thead>
                  <tr>
                    <th style={th}>
                      Ел-мер
                    </th>
                    <th style={th}>
                      Зона
                    </th>
                    <th style={th}>
                      Разлика
                    </th>
                    <th style={th}>
                      Общо кВтч
                    </th>
                    <th style={th}>
                      Начисл.
                      кВтч
                    </th>
                    <th style={th}>
                      Цена
                    </th>
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td style={td}>
                      012345678
                    </td>
                    <td style={td}>
                      Д НН
                    </td>
                    <td style={td}>
                      600
                    </td>
                    <td style={td}>
                      600
                    </td>
                    <td style={td}>
                      600
                    </td>
                    <td style={td}>
                      0.33139
                    </td>
                  </tr>

                  <tr>
                    <td style={td}>
                      012345678
                    </td>
                    <td style={td}>
                      Н НН
                    </td>
                    <td style={td}>
                      61
                    </td>
                    <td style={td}>
                      61
                    </td>
                    <td style={td}>
                      61
                    </td>
                    <td style={td}>
                      0.33139
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <button
              onClick={() =>
                setShowExample(false)
              }
              style={{
                marginTop: 18,
                padding:
                  "12px 18px",
                borderRadius: 12,
                border: 0,
                background:
                  "#059669",
                color: "white",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Разбрах
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(15,23,42,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent:
              "center",
            zIndex: 9999,
            flexDirection: "column",
            color: "white",
            fontFamily: "Arial",
          }}
        >
          <div
            style={{
              width: 70,
              height: 70,
              border:
                "6px solid rgba(255,255,255,0.2)",
              borderTop:
                "6px solid white",
              borderRadius: "50%",
              animation:
                "spin 1s linear infinite",
            }}
          />

          <h2
            style={{
              marginTop: 30,
            }}
          >
            Обработваме
            фактурата...
          </h2>

          <p
            style={{
              opacity: 0.85,
              maxWidth: 420,
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            Извличаме данни за
            обекти, ИТН, тарифи и
            потребление. Моля
            изчакайте.
          </p>

          <style jsx>{`
            @keyframes spin {
              0% {
                transform: rotate(
                  0deg
                );
              }
              100% {
                transform: rotate(
                  360deg
                );
              }
            }
          `}</style>
        </div>
      )}
    </main>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  borderBottom:
    "2px solid #0f172a",
  padding: 8,
};

const td: React.CSSProperties = {
  borderBottom:
    "1px solid #cbd5e1",
  padding: 8,
};
