"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ProcessInvoicePage() {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadFiles() {
    const { data } = await supabase
      .from("invoice_uploads")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setFiles(data);
  }

  useEffect(() => {
    loadFiles();
  }, []);

  async function extractInvoice(file: any) {
    setLoading(true);

    try {
      const response = await fetch("/api/extract-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileUrl: file.file_url,
        }),
      });

      const text = await response.text();

      let result: any = null;

      try {
        result = JSON.parse(text);
      } catch {
        alert(
          "API върна невалиден JSON.\n\n" +
            "HTTP status: " +
            response.status +
            "\n\nПървите 500 символа от отговора:\n\n" +
            text.slice(0, 500)
        );

        setLoading(false);
        return;
      }

      if (!response.ok || result.error) {
        alert(
          "API грешка:\n\n" +
            (result.error || response.statusText)
        );

        setLoading(false);
        return;
      }

      console.log(result);

      alert(
        "Извличането приключи ✅\n\n" +
          JSON.stringify(result.extracted, null, 2)
      );

      await loadFiles();
    } catch (error) {
      alert(
        "Грешка при extraction:\n\n" +
          (error instanceof Error ? error.message : String(error))
      );
    }

    setLoading(false);
  }

  return (
    <main
      style={{
        padding: 40,
        fontFamily: "Arial",
        background: "#f8fafc",
        minHeight: "100vh",
      }}
    >
      <h1>Invoice Processing</h1>

      <p
        style={{
          color: "#64748b",
          marginBottom: 32,
        }}
      >
        Качени фактури за extraction.
      </p>

      <div
        style={{
          display: "grid",
          gap: 20,
        }}
      >
        {files.map((file) => (
          <div
            key={file.id}
            style={{
              background: "white",
              padding: 24,
              borderRadius: 18,
              boxShadow: "0 8px 30px rgba(15,23,42,0.08)",
            }}
          >
            <div style={{ marginBottom: 10 }}>
              <strong>Upload ID:</strong> {file.id}
            </div>

            <div style={{ marginBottom: 10 }}>
              <strong>File:</strong>{" "}
              <a href={file.file_url} target="_blank">
                Open PDF
              </a>
            </div>

            <div style={{ marginBottom: 10 }}>
              <strong>Status:</strong>{" "}
              {file.extraction_status || "pending"}
            </div>

            <div style={{ marginBottom: 20 }}>
              <strong>Created:</strong>{" "}
              {new Date(file.created_at).toLocaleString()}
            </div>

            <button
              onClick={() => extractInvoice(file)}
              disabled={loading}
              style={{
                padding: "12px 18px",
                borderRadius: 12,
                border: 0,
                background: "#2563eb",
                color: "white",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {loading ? "Обработва..." : "Извлечи данни"}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
