import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { safeRedirect } from "@/lib/safe-redirect";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";
import logoUrl from "@/assets/logo.png";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/signin")({
  validateSearch: searchSchema,
  component: SignInPage,
  head: () => ({ meta: [{ title: "Sign in — Fixido" }] }),
});

function SignInPage() {
  const { lang } = useI18n();
  const { redirect } = Route.useSearch();
  const nav = useNavigate();
  const { user, loading: authLoading, roles, rolesReady } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const defaultDestination = roles.includes("provider")
    ? "/provider/dashboard"
    : roles.includes("admin")
      ? "/admin"
      : "/";

  useEffect(() => {
    if (!authLoading && rolesReady && user) {
      nav({ to: safeRedirect(redirect, defaultDestination), replace: true });
    }
  }, [authLoading, rolesReady, user, nav, redirect, defaultDestination]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      return setErr(error.message);
    }
    // Reject hard-blocked accounts immediately.
    const uid = data.user?.id;
    if (uid) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("is_blocked, block_type, blocked_reason")
        .eq("id", uid)
        .maybeSingle();
      if (prof?.is_blocked && prof.block_type === "hard") {
        await supabase.auth.signOut({ scope: "local" });
        setLoading(false);
        return setErr(
          lang === "en"
            ? `Your account has been blocked and cannot sign in.${prof.blocked_reason ? ` Reason: ${prof.blocked_reason}.` : ""} Please contact support.`
            : `သင်၏ အကောင့်ကို ပိတ်ထားသဖြင့် ဝင်ရောက်၍ မရပါ။${prof.blocked_reason ? ` အကြောင်းရင်း — ${prof.blocked_reason}။` : ""} ဆက်သွယ်ပါ။`,
        );
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <main className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-20">
        {redirect?.startsWith("/request") && (
          <div className="mb-6 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-center text-sm text-foreground/90">
            {lang === "en"
              ? "Sign in to send your service request. Browsing providers stays free — an account is only needed to contact them."
              : "ဝန်ဆောင်မှု တောင်းဆိုရန် အကောင့်ဝင်ပါ။ ဝန်ဆောင်မှုပေးသူများကို ကြည့်ရှုခြင်းသည် အခမဲ့ဖြစ်ပြီး တောင်းဆိုရန်မှသာ အကောင့်လိုပါသည်။"}
          </div>
        )}
        <div className="text-center">
          <img
            src={logoUrl}
            alt="Fixido"
            className="mx-auto h-14 w-14 rounded-2xl shadow-lg shadow-primary/15"
          />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">
            {lang === "en" ? "Welcome back" : "ပြန်လာကြိုဆိုပါသည်"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {lang === "en" ? "Sign in to your Fixido account" : "သင်၏ Fixido အကောင့်သို့ ဝင်ရောက်ပါ"}
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
            {lang === "en" ? "New to Fixido?" : "Fixido သို့ အသစ်ရောက်ပါသလား?"}{" "}
            <Link to="/signup" search={{ as: undefined }} className="font-semibold text-primary hover:underline">
              {lang === "en" ? "Create an account" : "အကောင့်ဖွင့်ရန်"}
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}