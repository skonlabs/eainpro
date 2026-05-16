import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { safeRedirect } from "@/lib/safe-redirect";
import { useState } from "react";

const searchSchema = z.object({
  as: z.enum(["customer", "provider"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/signup")({
  validateSearch: searchSchema,
  component: SignUpPage,
});

function SignUpPage() {
  const { as, redirect } = Route.useSearch();
  const { lang } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"customer" | "provider">(as ?? "customer");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });
    setLoading(false);
    if (error) return setErr(error.message);
    // When email confirmation is required, Supabase returns no session.
    // Show a check-your-inbox message instead of silently redirecting.
    if (!data.session) {
      setNeedsConfirm(true);
      return;
    }
    const defaultDest = role === "provider" ? "/provider/onboarding" : "/";
    window.location.href = safeRedirect(redirect, defaultDest);
  };

  if (needsConfirm) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Header />
        <main className="mx-auto max-w-md px-4 py-8 sm:px-6 sm:py-16">
          <h1 className="text-2xl font-bold tracking-tight">
            {lang === "en" ? "Check your inbox" : "သင့်အီးမေးလ်ကို စစ်ဆေးပါ"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {lang === "en"
              ? `We sent a confirmation link to ${email}. Click it to activate your account, then sign in.`
              : `${email} ထံသို့ အတည်ပြုလင့်ခ်တစ်ခု ပို့ပြီးပါပြီ။ အကောင့်ကို အသက်သွင်းရန် နှိပ်ပြီး ဝင်ရောက်ပါ။`}
          </p>
          <div className="mt-6 flex gap-2">
            <Link to="/signin" className="flex-1">
              <Button className="w-full">
                {lang === "en" ? "Go to sign in" : "ဝင်ရောက်ရန် သွားပါ"}
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="mx-auto max-w-md px-4 py-8 sm:px-6 sm:py-16">
        <h1 className="text-2xl font-bold tracking-tight">
          {lang === "en" ? "Create an account" : "အကောင့်ဖွင့်ရန်"}
        </h1>

        <div className="mt-4 flex gap-2 rounded-lg bg-secondary p-1">
          {(["customer", "provider"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                role === r ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r === "customer"
                ? lang === "en" ? "Customer" : "ဖောက်သည်"
                : lang === "en" ? "Provider" : "ဝန်ဆောင်မှုပေးသူ"}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-3 rounded-xl border border-border bg-card p-5">
          <Input
            required
            placeholder={lang === "en" ? "Full name" : "အမည်"}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            required
            minLength={6}
            placeholder={lang === "en" ? "Password (min 6)" : "စကားဝှက် (အနည်းဆုံး ၆ လုံး)"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {err && <p className="text-xs text-destructive">{err}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "…" : lang === "en" ? "Create account" : "အကောင့်ဖွင့်ရန်"}
          </Button>
          <p className="pt-2 text-center text-xs text-muted-foreground">
            {lang === "en" ? "Already have an account?" : "အကောင့်ရှိပြီးပါက"}{" "}
            <Link to="/signin" className="text-primary hover:underline">
              {lang === "en" ? "Sign in" : "ဝင်ရောက်"}
            </Link>
          </p>
        </form>
      </main>
      <Footer />
    </div>
  );
}