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

      const { data: insertedInvoice, error: insertError } = await supabase
        .from("invoice_uploads")
        .insert({
          file_url: fileUrl,
          extraction_status: "pending",
        })
        .select()
        .single();

      if (insertError || !insertedInvoice) {
        throw new Error(insertError?.message || "Invoice insert failed");
      }

      const extractionResponse = await fetch("/api/extract-invoice", {
        method: "POST
