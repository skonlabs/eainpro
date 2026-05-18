import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { safeRedirect } from "@/lib/safe-redirect";
import { useState } from "react";
import { Loader2, Mail } from "lucide-react";

const searchSchema = z.object({
  as: z.enum(["customer", "provider"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/signup")({
  validateSearch: searchSchema,
  component: SignUpPage,
  head: () => ({ meta: [{ title: "Create account — Eain Pro" }] }),
});

function SignUpPage() {
  const { as, redirect } = Route.useSearch();
  const { lang } = useI18n();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"customer" | "provider">(as ?? "customer");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const L = (en: string, my: string) => (lang === "en" ? en : my);

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
    if (!data.session) {
      setNeedsConfirm(true);
      return;
    }
    const defaultDest = role === "provider" ? "/provider/onboarding" : "/";
    nav({ to: safeRedirect(redirect, defaultDest) });
  };

  if (needsConfirm) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <main className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-20">
          <div className="text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary shadow-sm">
              <Mail className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight">
              {L("Check your inbox", "သင့်အီးမေးလ်ကို စစ်ဆေးပါ")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {L(
                `We sent a confirmation link to ${email}. Click it to activate your account, then sign in.`,
                `${email} ထံသို့ အတည်ပြုလင့်ခ်တစ်ခု ပို့ပြီးပါပြီ။ အကောင့်ကို အသက်သွင်းရန် နှိပ်ပြီး ဝင်ရောက်ပါ။`
              )}
            </p>
          </div>
          <div className="mt-8">
            <Link to="/signin">
              <Button className="h-11 w-full rounded-xl font-semibold">
                {L("Go to sign in", "ဝင်ရောက်ရန် သွားပါ")}
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <main className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-20">
        <div className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground text-xl font-extrabold shadow-lg shadow-primary/25">
            E
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">
            {L("Create your account", "အကောင့်ဖွင့်ပါ")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {L("Join Eain Pro — Myanmar's home services marketplace", "Eain Pro သို့ ဝင်ရောက်ပါ")}
          </p>
        </div>

        <div className="mt-6 flex gap-1.5 rounded-2xl bg-secondary p-1.5">
          {(["customer", "provider"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                role === r
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r === "customer"
                ? L("I need a service", "ဝန်ဆောင်မှု လိုသည်")
                : L("I provide services", "ဝန်ဆောင်မှု ပေးသည်")}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-soft">
            <Input
              required
              placeholder={L("Full name", "အမည်")}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-11"
              autoComplete="name"
            />
            <Input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
              autoComplete="email"
            />
            <Input
              type="password"
              required
              minLength={6}
              placeholder={L("Password (min 6 characters)", "စကားဝှက် (အနည်းဆုံး ၆ လုံး)")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11"
              autoComplete="new-password"
            />
            {err && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                {err}
              </p>
            )}
            <Button type="submit" className="h-11 w-full rounded-xl font-semibold" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {L("Creating account…", "အကောင့် ဖွင့်နေ…")}
                </>
              ) : L("Create account", "အကောင့်ဖွင့်ရန်")}
            </Button>
          </div>

          <div className="rounded-2xl border border-border bg-card/60 p-4 text-center text-sm text-muted-foreground">
            {L("Already have an account?", "အကောင့်ရှိပြီးပါက")}{" "}
            <Link to="/signin" className="font-semibold text-primary hover:underline">
              {L("Sign in", "ဝင်ရောက်")}
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
