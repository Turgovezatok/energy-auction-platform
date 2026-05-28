"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function ConsumerOnboardingPage() {
  const router = useRouter();

  const [companyName, setCompanyName] = useState("");
  const [eik, setEik] = useState("");
  const [email, setEmail] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [showExample, setShowExample] = useState(false);

  async function submit() {
    if (!companyName || !eik || !email || !invoiceFile) {
      alert("Попълнете всички полета и качете PDF фактура.");
      return;
    }

    setLoading(true);

    try {
      const filePath = `consumer-invoices/${Date.now()}-${invoiceFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from("invoice-files")
        .upload(filePath, invoiceFile);

      if (uploadError) throw new Error(uploadError.message);

      const { data: publicUrlData } = supabase.storage
        .from("invoice-files")
        .getPublicUrl(filePath);

      const fileUrl = publicUrlData.publicUrl;

      const { error: insertError } = await supabase
        .from("invoice_uploads")
        .insert({
          file_url: fileUrl,
          customer_name: companyName,
          customer_eik: eik,
          extraction_status: "pending",
        });

      if (insertError) throw new Error(insertError.message);

      const extractionResponse = await fetch("/api/extract-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileUrl }),
      });

      const extractionResult = await extractionResponse.json();

      if (!extractionResponse.ok || extractionResult.error) {
        throw new Error(extractionResult.error || "Extraction failed");
      }

      router.push("/my-auctions");
    } catch (error) {
      alert(
        "Грешка:\n\n" +
          (error instanceof Error ? error.message : String(error))
      );
    }

    setLoading(false);
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
          boxShadow: "0 14px 40px rgba(15,23,42,0.08)",
        }}
      >
        <h1>Потребител без централа</h1>

        <p
          style={{
            color: "#64748b",
            marginBottom: 28,
            fontSize: 17,
            lineHeight: 1.6,
          }}
        >
          Попълнете основните данни. След това прикачете последна фактура от
          настоящия Ви доставчик.
        </p>

        <input
          placeholder="Име на фирма"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="ЕИК"
          value={eik}
          onChange={(e) => setEik(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Имейл"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        <div style={invoiceBoxStyle}>
          <p
            style={{
              color: "#334155",
              fontSize: 19,
              lineHeight: 1.7,
              fontWeight: 600,
              marginTop: 0,
              marginBottom: 18,
            }}
          >
            Прикачете последна фактура от настоящия Ви доставчик. От нея ще
            направим калкулации и ще Ви предложим най-подходящите за Вас
            условия.
          </p>

          <button
            type="button"
            onClick={() => setShowExample(true)}
            style={exampleButtonStyle}
          >
            Виж пример каква фактура ни трябва
          </button>

          <label>
            <strong>Качете PDF фактура *</strong>
          </label>

          <input
            type="file"
            accept="application/pdf"
            required
            onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
            style={{
              display: "block",
              marginTop: 14,
            }}
          />
        </div>

        <button onClick={submit} disabled={loading} style={submitButtonStyle}>
          {loading ? "Обработва..." : "Продължи"}
        </button>
      </div>

      {showExample && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <h2>Каква информация търсим във фактурата?</h2>

            <p
              style={{
                color: "#475569",
                lineHeight: 1.6,
              }}
            >
              Във фактурата трябва да има справка по обекти/ИТН, електромер и
              консумация по часови зони. Пример:
            </p>

            <div style={exampleBoxStyle}>
              <div>
                <strong>Обект ИТН № 1665820</strong>
              </div>
              <div>Място на потребление: ГР. ПЛОВДИВ УЛ. САМАРА 13</div>
              <div>Наименование: ЕВРО - АЛИАНС ООД</div>
              <div>Отчетен период: 01.02.2025 - 28.02.2025</div>

              <br />

              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr>
                    <th style={th}>Ел-мер</th>
                    <th style={th}>Зона</th>
                    <th style={th}>Разлика</th>
                    <th style={th}>Общо кВтч</th>
                    <th style={th}>Начисл. кВтч</th>
                    <th style={th}>Цена</th>
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td style={td}>013934539</td>
                    <td style={td}>Д НН</td>
                    <td style={td}>600</td>
                    <td style={td}>600</td>
                    <td style={td}>600</td>
                    <td style={td}>0.33139</td>
                  </tr>

                  <tr>
                    <td style={td}>013934539</td>
                    <td style={td}>Н НН</td>
                    <td style={td}>61</td>
                    <td style={td}>61</td>
                    <td style={td}>61</td>
                    <td style={td}>0.33139</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p
              style={{
                color: "#64748b",
                marginTop: 18,
                lineHeight: 1.6,
              }}
            >
              От тези данни системата извлича ИТН, адрес, електромер,
              дневна/нощна консумация, обща консумация и цена.
            </p>

            <button onClick={() => setShowExample(false)} style={closeButtonStyle}>
              Разбрах
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 14,
  marginTop: 16,
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  fontSize: 16,
};

const invoiceBoxStyle: React.CSSProperties = {
  marginTop: 28,
  marginBottom: 30,
  padding: 22,
  borderRadius: 18,
  background: "#f1f5f9",
  border: "1px solid #cbd5e1",
};

const exampleButtonStyle: React.CSSProperties = {
  marginBottom: 20,
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #059669",
  background: "white",
  color: "#059669",
  fontWeight: 700,
  cursor: "pointer",
};

const submitButtonStyle: React.CSSProperties = {
  padding: "14px 24px",
  borderRadius: 14,
  border: 0,
  background: "#059669",
  color: "white",
  fontWeight: 700,
  fontSize: 16,
  cursor: "pointer",
};

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 100,
  padding: 24,
};

const modalStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 24,
  padding: 28,
  maxWidth: 920,
  width: "100%",
  boxShadow: "0 30px 80px rgba(15,23,42,0.35)",
};

const exampleBoxStyle: React.CSSProperties = {
  marginTop: 18,
  padding: 18,
  borderRadius: 16,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  overflowX: "auto",
  fontFamily: "monospace",
  fontSize: 14,
  lineHeight: 1.6,
};

const closeButtonStyle: React.CSSProperties = {
  marginTop: 18,
  padding: "12px 18px",
  borderRadius: 12,
  border: 0,
  background: "#059669",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};

const th: React.CSSProperties = {
  textAlign: "left",
  borderBottom: "2px solid #0f172a",
  padding: 8,
};

const td: React.CSSProperties = {
  borderBottom: "1px solid #cbd5e1",
  padding: 8,
};
