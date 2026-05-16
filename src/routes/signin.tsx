import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { useState } from "react";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/signin")({
  validateSearch: searchSchema,
  component: SignInPage,
});

function SignInPage() {
  const { lang } = useI18n();
  const { redirect } = Route.useSearch();
  const nav = useNavigate();
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
    if (redirect) {
      window.location.href = redirect;
    } else {
      nav({ to: "/" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {lang === "en" ? "Sign in" : "ဝင်ရောက်ရန်"}
        </h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-3 rounded-xl border border-border bg-card p-5">
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
            placeholder={lang === "en" ? "Password" : "စကားဝှက်"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {err && <p className="text-xs text-destructive">{err}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "…" : lang === "en" ? "Sign in" : "ဝင်ရောက်"}
          </Button>
          <p className="pt-2 text-center text-xs text-muted-foreground">
            {lang === "en" ? "New here?" : "အကောင့်မရှိသေးပါက"}{" "}
            <Link to="/signup" search={{ as: undefined }} className="text-primary hover:underline">
              {lang === "en" ? "Create an account" : "အကောင့်ဖွင့်ရန်"}
            </Link>
          </p>
        </form>
      </main>
      <Footer />
    </div>
  );
}