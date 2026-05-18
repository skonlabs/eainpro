import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { Loader2, KeyRound, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({ meta: [{ title: "Reset password — Eain Pro" }] }),
});

function ResetPasswordPage() {
  const { lang } = useI18n();
  const nav = useNavigate();
  const [mode, setMode] = useState<"request" | "update">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const L = (en: string, my: string) => (lang === "en" ? en : my);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      setMode("update");
    }
  }, []);

  const requestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setMsg(L("Check your email for a reset link.", "သင်၏ အီးမေးလ်ထဲ ပြန်ပြင်ရန် လင့်ခ်ကို စစ်ပါ။"));
  };

  const updatePw = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setErr(error.message);
    else {
      setMsg(L("Password updated.", "စကားဝှက် ပြောင်းပြီးပါပြီ။"));
      setTimeout(() => nav({ to: "/" }), 800);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <main className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-20">
        <div className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary shadow-sm">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">
            {mode === "update"
              ? L("Set a new password", "စကားဝှက်အသစ် သတ်မှတ်ပါ")
              : L("Reset your password", "စကားဝှက် ပြန်ပြင်ရန်")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "update"
              ? L("Choose a strong password for your account.", "အကောင့်အတွက် ခိုင်မာသော စကားဝှက် ရွေးပါ။")
              : L("Enter your email and we'll send you a reset link.", "သင်၏ အီးမေးလ်ထည့်ပါ၊ ပြန်ပြင်ရန် လင့်ခ် ပို့ပေးမည်။")}
          </p>
        </div>

        <form onSubmit={mode === "update" ? updatePw : requestLink} className="mt-8 space-y-3">
          <div className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-soft">
            {mode === "request" ? (
              <Input
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
                autoComplete="email"
              />
            ) : (
              <Input
                type="password"
                required
                minLength={6}
                placeholder={L("New password (min 6 characters)", "စကားဝှက်အသစ် (အနည်းဆုံး ၆ လုံး)")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
                autoComplete="new-password"
              />
            )}
            {err && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                {err}
              </p>
            )}
            {msg && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <p className="text-xs font-medium text-emerald-700">{msg}</p>
              </div>
            )}
            <Button type="submit" disabled={busy} className="h-11 w-full rounded-xl font-semibold">
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {L("Sending…", "ပို့နေ…")}
                </>
              ) : mode === "update"
                ? L("Update password", "စကားဝှက် ပြောင်း")
                : L("Send reset link", "လင့်ခ် ပို့ပါ")}
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            <Link to="/signin" search={{ redirect: undefined }} className="font-medium text-primary hover:underline">
              {L("Back to sign in", "ဝင်ရောက်ရန် ပြန်သွား")}
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
