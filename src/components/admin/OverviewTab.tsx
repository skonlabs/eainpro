import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { fmt } from "@/lib/wallet";

export function OverviewTab({ onJump }: { onJump: (tab: string) => void }) {
  const [stats, setStats] = useState<any>(null);
  useEffect(() => {
    (async () => {
      const [
        { count: leads },
        { count: unlocks },
        { data: unlockRows },
        { count: pending },
      ] = await Promise.all([
        supabase.from("customer_leads").select("*", { head: true, count: "exact" }),
        supabase.from("provider_lead_unlocks").select("*", { head: true, count: "exact" }),
        supabase
          .from("provider_lead_unlocks")
          .select("unlock_price_credits, refunded_amount_credits"),
        supabase
          .from("provider_credit_topups")
          .select("*", { head: true, count: "exact" })
          .eq("status", "pending"),
      ]);
      const revenue = (unlockRows ?? []).reduce(
        (s, r: any) =>
          s + ((r.unlock_price_credits ?? 0) - (r.refunded_amount_credits ?? 0)),
        0,
      );
      setStats({ leads: leads ?? 0, unlocks: unlocks ?? 0, revenue, pending: pending ?? 0 });
    })();
  }, []);
  if (!stats) return <Skeleton className="mt-4 h-32 w-full" />;
  const cards = [
    { k: "Leads", v: stats.leads, tab: "refunds" },
    { k: "Unlocks", v: stats.unlocks, tab: "refunds" },
    { k: "Net revenue (credits)", v: fmt(stats.revenue), tab: "revenue" },
    { k: "Pending top-ups", v: stats.pending, tab: "topups" },
  ];
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => (
        <button
          key={c.k}
          type="button"
          onClick={() => onJump(c.tab)}
          className="rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary/60 hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <div className="text-2xl font-bold">{c.v}</div>
          <div className="text-xs text-muted-foreground">{c.k}</div>
        </button>
      ))}
    </div>
  );
}