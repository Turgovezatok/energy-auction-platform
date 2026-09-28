"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const RESEND_COOLDOWN_SECONDS = 60;

type EmailVerificationProps = {
  email: string;
  onVerifiedChange: (verified: boolean) => void;
};

function normalize(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

export default function EmailVerification({
  email,
  onVerifiedChange,
}: EmailVerificationProps) {
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const verified = Boolean(email) && normalize(sessionEmail) === normalize(email);

  useEffect(() => {
    function applySession(user: { email?: string; email_confirmed_at?: string } | null | undefined) {
      setSessionEmail(user?.email_confirmed_at ? user.email ?? null : null);
    }

    supabase.auth.getSession().then(({ data }) => applySession(data.session?.user));

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session?.user);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    onVerifiedChange(verified);
  }, [verified, onVerifiedChange]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function sendLink() {
    const target = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      setError("Въведете валиден имейл.");
      return;
    }

    setSending(true);
    setError(null);

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: target,
      options: { emailRedirectTo: window.location.href },
    });

    setSending(false);

    if (otpError) {
      setError(
        otpError.status === 429
          ? "Изпратени са твърде много имейли. Опитайте отново след малко."
          : `Не успяхме да изпратим имейла: ${otpError.message}`
      );
      return;
    }

    setSentTo(target);
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  if (verified) {
    return (
      <div
        role="status"
        className="flex items-center gap-3 rounded-md border border-success bg-success-light p-4 text-success dark:bg-success-dark-light"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success text-xs font-bold text-white" aria-hidden="true">
          {"✓"}
        </span>
        <span className="font-semibold">Имейлът {email} е потвърден.</span>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-warning bg-warning-light p-4 dark:bg-warning-dark-light">
      <div className="font-semibold text-black dark:text-white-light">
        Потвърдете имейла си, за да публикувате търга
      </div>
      <p className="mt-1 text-sm text-white-dark">
        {sentTo
          ? `Изпратихме линк до ${sentTo}. Отворете го — тази страница ще се отключи автоматично. Проверете и папка „Спам“.`
          : "Ще получите имейл с линк за потвърждение. Попълнените данни остават на страницата."}
      </p>
      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={sendLink}
        disabled={sending || cooldown > 0}
        className="btn btn-warning btn-sm mt-3"
      >
        {sending
          ? "Изпращаме..."
          : cooldown > 0
            ? `Изпрати отново след ${cooldown} сек.`
            : sentTo
              ? "Изпрати линка отново"
              : "Изпрати линк за потвърждение"}
      </button>
    </div>
  );
}
