import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";

type ConfirmSearch = {
  token_hash?: string;
  type?:
    | "signup"
    | "recovery"
    | "magiclink"
    | "invite"
    | "email_change"
    | "email"
    | "email_change_new";
  next?: string;
};

export const Route = createFileRoute("/auth/confirm")({
  validateSearch: (search: Record<string, unknown>): ConfirmSearch => ({
    token_hash: typeof search.token_hash === "string" ? search.token_hash : undefined,
    type: search.type as ConfirmSearch["type"],
    next: typeof search.next === "string" ? search.next : undefined,
  }),
  component: ConfirmPage,
});

function ConfirmPage() {
  const { token_hash, type, next } = Route.useSearch();
  const navigate = useNavigate();
  const { lang } = useI18n();
  const L = (en: string, my: string) => (lang === "en" ? en : my);
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [message, setMessage] = useState(L("Verifying your email…", "အီးမေးလ် အတည်ပြုနေ…"));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token_hash || !type) {
        setStatus("error");
        setMessage(L("Invalid or missing confirmation link.", "အတည်ပြုချက် လင့်ခ် မမှန်ကန်ပါ သို့မဟုတ် မပါဝင်ပါ။"));
        return;
      }
      const otpType = type === "email_change_new" ? "email_change" : type;
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: otpType as
          | "signup"
          | "recovery"
          | "magiclink"
          | "invite"
          | "email_change"
          | "email",
      });
      if (cancelled) return;
      if (error) {
        setStatus("error");
        setMessage(error.message || L("We couldn't verify this link. It may have expired.", "ဤ လင့်ခ်ကို အတည်မပြုနိုင်ပါ။ သက်တမ်းကုန်သွားနိုင်ပါသည်။"));
        return;
      }
      if (type === "recovery") {
        navigate({ to: "/reset-password", replace: true });
        return;
      }
      const target = next && next.startsWith("/") ? next : "/";
      window.location.replace(target);
    })();
    return () => {
      cancelled = true;
    };
  }, [token_hash, type, next, navigate]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-3">
        <h1 className="text-2xl font-semibold">
          {status === "loading"
            ? L("Confirming…", "အတည်ပြုနေ…")
            : L("Confirmation failed", "အတည်မပြုနိုင်ပါ")}
        </h1>
        <p className="text-muted-foreground">{message}</p>
        {status === "error" && (
          <a href="/signin" className="text-primary underline">
            {L("Back to sign in", "ဝင်ရောက်ရန် ပြန်သွား")}
          </a>
        )}
      </div>
    </div>
  );
}
