import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin — Eain Pro" }] }),
});

type ProviderRow = {
  id: string;
  business_name: string | null;
  is_verified: boolean;
  is_suspended: boolean;
  rating_avg: number;
  jobs_completed: number;
  created_at: string;
};

function AdminPage() {
  const { lang } = useI18n();
  const { user, roles, loading } = useAuth();
  const nav = useNavigate();
  const [providers, setProviders] = useState<ProviderRow[] | null>(null);
  const [counts, setCounts] = useState<{ jobs: number; bookings: number; reviews: number } | null>(null);

  const isAdmin = roles.includes("admin");

  const refresh = async () => {
    const [{ data: ps }, { count: j }, { count: b }, { count: r }] = await Promise.all([
      supabase.from("providers").select("id, business_name, is_verified, is_suspended, rating_avg, jobs_completed, created_at").order("created_at", { ascending: false }),
      supabase.from("job_requests").select("*", { head: true, count: "exact" }),
      supabase.from("bookings").select("*", { head: true, count: "exact" }),
      supabase.from("reviews").select("*", { head: true, count: "exact" }),
    ]);
    setProviders((ps ?? []) as ProviderRow[]);
    setCounts({ jobs: j ?? 0, bookings: b ?? 0, reviews: r ?? 0 });
  };

  useEffect(() => {
    if (loading) return;
    if (!user) return void nav({ to: "/signin", search: { redirect: "/admin" } });
    if (!isAdmin) return;
    refresh();
  }, [loading, user, isAdmin, nav]);

  if (loading || !user) return null;
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">

        <main className="mx-auto max-w-xl px-4 py-8 sm:px-6 sm:py-16 text-center">
          <h1 className="text-xl font-bold">{lang === "en" ? "Admin only" : "Admin သာ"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {lang === "en"
              ? "Your account does not have the admin role. Ask a database administrator to grant it via the user_roles table."
              : "သင်၏ အကောင့်တွင် admin role မရှိပါ။ user_roles ဇယားမှ ထည့်ပေးရန် တောင်းဆိုပါ။"}
          </p>
        </main>
      </div>
    );
  }

  const setVerified = async (id: string, v: boolean, name: string) => {
    const msg = v
      ? (lang === "en" ? `Verify "${name}"?` : `"${name}" ကို အတည်ပြုမလား?`)
      : (lang === "en" ? `Remove verification from "${name}"?` : `"${name}" ၏ အတည်ပြုမှု ဖျက်မလား?`);
    if (!window.confirm(msg)) return;
    const { error } = await supabase.from("providers").update({ is_verified: v }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success(v ? (lang === "en" ? "Verified" : "အတည်ပြုပြီး") : (lang === "en" ? "Unverified" : "ဖျက်ပြီး"));
    refresh();
  };
  const setSuspended = async (id: string, s: boolean, name: string) => {
    const msg = s
      ? (lang === "en" ? `Suspend "${name}"? They won't be able to receive jobs.` : `"${name}" ကို ရပ်ဆိုင်းမလား?`)
      : (lang === "en" ? `Unsuspend "${name}"?` : `"${name}" ကို ပြန်ဖွင့်မလား?`);
    if (!window.confirm(msg)) return;
    const { error } = await supabase.from("providers").update({ is_suspended: s }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success(s ? (lang === "en" ? "Suspended" : "ရပ်ဆိုင်းပြီး") : (lang === "en" ? "Unsuspended" : "ပြန်ဖွင့်ပြီး"));
    refresh();
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-14">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {lang === "en" ? "Admin console" : "Admin စီမံခန့်ခွဲ"}
        </h1>
        {counts && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { k: "jobs", v: counts.jobs, en: "Jobs", my: "အလုပ်" },
              { k: "bookings", v: counts.bookings, en: "Bookings", my: "ဘွတ်ကင်" },
              { k: "reviews", v: counts.reviews, en: "Reviews", my: "သုံးသပ်" },
            ].map((c) => (
              <div key={c.k} className="rounded-2xl border border-border bg-card p-4">
                <div className="text-2xl font-bold">{c.v}</div>
                <div className="text-xs text-muted-foreground">{lang === "en" ? c.en : c.my}</div>
              </div>
            ))}
          </div>
        )}
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">{lang === "en" ? "Providers" : "ဝန်ဆောင်မှုပေးသူများ"}</h2>
          {!providers && (
            <ul className="divide-y divide-border">
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className="flex items-center justify-between py-3">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-16 rounded-md" />
                    <Skeleton className="h-8 w-16 rounded-md" />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <ul className="divide-y divide-border">
            {(providers ?? []).map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.business_name ?? "—"}</span>
                    {p.is_verified && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {lang === "en" ? "Verified" : "အတည်ပြုပြီး"}
                      </span>
                    )}
                    {p.is_suspended && (
                      <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                        {lang === "en" ? "Suspended" : "ရပ်ဆိုင်း"}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {p.rating_avg.toFixed(1)}★ · {p.jobs_completed} {lang === "en" ? "jobs" : "အလုပ်"} ·{" "}
                    {new Date(p.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={p.is_verified ? "outline" : "default"}
                    onClick={() => setVerified(p.id, !p.is_verified, p.business_name ?? "—")}
                  >
                    {p.is_verified
                      ? lang === "en" ? "Unverify" : "ပယ်ဖျက်"
                      : lang === "en" ? "Verify" : "အတည်ပြု"}
                  </Button>
                  <Button
                    size="sm"
                    variant={p.is_suspended ? "default" : "ghost"}
                    className={p.is_suspended ? "" : "text-destructive hover:bg-destructive/10"}
                    onClick={() => setSuspended(p.id, !p.is_suspended, p.business_name ?? "—")}
                  >
                    {p.is_suspended
                      ? lang === "en" ? "Unsuspend" : "ပြန်ဖွင့်"
                      : lang === "en" ? "Suspend" : "ရပ်ဆိုင်း"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>

    </div>
  );
}