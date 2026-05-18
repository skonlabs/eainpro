import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { safeRedirect } from "@/lib/safe-redirect";
import { useState } from "react";
import { Loader2 } from "lucide-react";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/signin")({
  validateSearch: searchSchema,
  component: SignInPage,
  head: () => ({ meta: [{ title: "Sign in — Eain Pro" }] }),
});

function SignInPage() {
  const { lang } = useI18n();
  const { redirect } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setErr(error.message);
    window.location.href = safeRedirect(redirect, "/");
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <main className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-20">
        <div className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground text-xl font-extrabold shadow-lg shadow-primary/25">
            E
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">
            {lang === "en" ? "Welcome back" : "ပြန်လာကြိုဆိုပါသည်"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {lang === "en" ? "Sign in to your Eain Pro account" : "သင်၏ Eain Pro အကောင့်သို့ ဝင်ရောက်ပါ"}
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-3">
          <div className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-soft">
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
              placeholder={lang === "en" ? "Password" : "စကားဝှက်"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11"
              autoComplete="current-password"
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
                  {lang === "en" ? "Signing in…" : "ဝင်ရောက်နေ…"}
                </>
              ) : lang === "en" ? "Sign in" : "ဝင်ရောက်"}
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            <Link to="/reset-password" className="hover:text-foreground hover:underline">
              {lang === "en" ? "Forgot password?" : "စကားဝှက် မေ့သွားပါသလား?"}
            </Link>
          </p>

          <div className="rounded-2xl border border-border bg-card/60 p-4 text-center text-sm text-muted-foreground">
            {lang === "en" ? "New to Eain Pro?" : "Eain Pro သို့ အသစ်ရောက်ပါသလား?"}{" "}
            <Link to="/signup" search={{ as: undefined }} className="font-semibold text-primary hover:underline">
              {lang === "en" ? "Create an account" : "အကောင့်ဖွင့်ရန်"}
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}