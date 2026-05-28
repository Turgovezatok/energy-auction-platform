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
      alert("Моля, въведете имейл и качете PDF фактура.");
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

      const { data: uploadRecord, error: insertError } = await supabase
        .from("invoice_uploads")
        .insert({
          file_url: fileUrl,
          extraction_status: "pending",
        })
        .select()
        .single();

      if (insertError || !uploadRecord) {
        throw new Error(insertError?.message || "Invoice upload insert failed");
      }

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

      router.push(`/confirm-auction?invoiceId=${uploadRecord.id}`);
    } catch (error) {
      alert(
        "Грешка:\n\n" +
          (error instanceof Error ? error.message : String(error))
      );
    }

    setLoading(false);
  }

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <h1>Потребител без централа</h1>

        <p style={introStyle}>
          Прикачете последна фактура от настоящия Ви доставчик. От нея ще
          направим калкулации и ще Ви предложим най-подходящите за Вас условия.
        </p>

        <input
          placeholder="Имейл за контакт"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        <div style={invoiceBoxStyle}>
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
            style={{ display: "block", marginTop: 14 }}
          />
        </div>

        <button onClick={submit} disabled={loading} style={submitButtonStyle}>
          {loading ? "Обработва фактурата..." : "Продължи"}
        </button>
      </div>

      {showExample && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <h2>Каква информация търсим във фактурата?</h2>

            <p style={{ color: "#475569", lineHeight: 1.6 }}>
              Във фактурата трябва да има справка по обекти/ИТН, електромер и
              консумация по часови зони. Пример:
            </
