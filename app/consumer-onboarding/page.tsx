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

  async function submit() {
    if (
      !companyName ||
      !eik ||
      !email ||
      !invoiceFile
    ) {
      alert(
        "Попълнете всички полета и качете фактура."
      );
      return;
    }

    setLoading(true);

    try {
      const filePath = `consumer-invoices/${Date.now()}-${invoiceFile.name}`;

      const { error: uploadError } =
        await supabase.storage
          .from("invoice-files")
          .upload(filePath, invoiceFile);

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: publicUrlData } =
        supabase.storage
          .from("invoice-files")
          .getPublicUrl(filePath);

      const fileUrl =
        publicUrlData.publicUrl;

      const { error: insertError } =
        await supabase
          .from("invoice_uploads")
          .insert({
            file_url: fileUrl,
            customer_name:
              companyName,
            customer_eik: eik,
            extraction_status:
              "pending",
          });

      if (insertError) {
        throw new Error(
          insertError.message
        );
      }

      const extractionResponse =
        await fetch(
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

      router.push("/my-auctions");
    } catch (error) {
      alert(
        "Грешка:\n\n" +
          (error instanceof Error
            ? error.message
            : String(error))
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
          maxWidth: 760,
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
            color: "#64748b",
            marginBottom: 30,
          }}
        >
          Попълнете данните и
          качете последната си
          фактура.
        </p>

        <input
          placeholder="Име на фирма"
          value={companyName}
          onChange={(e) =>
            setCompanyName(
              e.target.value
            )
          }
          style={inputStyle}
        />

        <input
          placeholder="ЕИК"
          value={eik}
          onChange={(e) =>
            setEik(e.target.value)
          }
          style={inputStyle}
        />

        <input
          placeholder="Имейл"
          value={email}
          onChange={(e) =>
            setEmail(
              e.target.value
            )
          }
          style={inputStyle}
        />

        <div
          style={{
            marginTop: 24,
            marginBottom: 30,
          }}
        >
          <label>
            <strong>
              Качете PDF фактура
            </strong>
          </label>

          <input
            type="file"
            accept="application/pdf"
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
    </main>
  );
}

const inputStyle = {
  width: "100%",
  padding: 14,
  marginTop: 16,
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  fontSize: 16,
};
