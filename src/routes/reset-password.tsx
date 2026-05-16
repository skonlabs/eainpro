import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({ meta: [{ title: "Reset password — Eain Pro" }] }),
});

function ResetPasswordPage() {
  const { lang } = useI18n();
  const [mode, setMode] = useState<"request" | "update">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    else
      setMsg(
        lang === "en"
          ? "Check your email for a reset link."
          : "သင်၏ အီးမေးလ်ထဲ ပြန်ပြင်ရန် လင့်ခ်ကို စစ်ပါ။",
      );
  };

  const updatePw = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setErr(error.message);
    else {
      setMsg(lang === "en" ? "Password updated." : "စကားဝှက် ပြောင်းပြီးပါပြီ။");
      setTimeout(() => (window.location.href = "/"), 800);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {mode === "update"
            ? lang === "en" ? "Set a new password" : "စကားဝှက်အသစ် သတ်မှတ်ပါ"
            : lang === "en" ? "Reset your password" : "စကားဝှက် ပြန်ပြင်ရန်"}
        </h1>
        <form
          onSubmit={mode === "update" ? updatePw : requestLink}
          className="mt-6 space-y-3 rounded-xl border border-border bg-card p-5"
        >
          {mode === "request" ? (
            <Input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          ) : (
            <Input
              type="password"
              required
              minLength={6}
              placeholder={lang === "en" ? "New password" : "စကားဝှက်အသစ်"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
          {err && <p className="text-xs text-destructive">{err}</p>}
          {msg && <p className="text-xs text-emerald-600">{msg}</p>}
          <Button type="submit" disabled={busy} className="w-full">
            {busy
              ? "…"
              : mode === "update"
                ? lang === "en" ? "Update password" : "စကားဝှက် ပြောင်း"
                : lang === "en" ? "Send reset link" : "လင့်ခ်ပို့ပါ"}
          </Button>
          <p className="pt-2 text-center text-xs text-muted-foreground">
            <Link to="/signin" search={{ redirect: undefined }} className="text-primary hover:underline">
              {lang === "en" ? "Back to sign in" : "ဝင်ရောက်ရန် ပြန်သွား"}
            </Link>
          </p>
        </form>
      </main>
      <Footer />
    </div>
  );
}
