import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { fmt } from "@/lib/wallet";

export function OverviewTab({ onJump }: { onJump: (tab: string) => void }) {
  const [stats, setStats] = useState<{
    leads: number;
    unlocks: number;
    revenue: number;
    pending: number;
  } | null>(null);
  useEffect(() => {
    (async () => {
      const [
        { count: leads },
        { data: byService },
        { count: pending },
      ] = await Promise.all([
        supabase.from("customer_leads").select("*", { head: true, count: "exact" }),
        // Aggregated view — matches the Revenue tab and avoids the 1000-row
        // SELECT cap that was capping the old client-side sum.
        supabase
          .from("lead_revenue_by_service")
          .select("unlocks_count, net_credits"),
        supabase
          .from("provider_credit_topups")
          .select("*", { head: true, count: "exact" })
          .eq("status", "pending"),
      ]);
      const totals = (byService ?? []).reduce(
        (a, r: { unlocks_count: number | null; net_credits: number | string | null }) => ({
          unlocks: a.unlocks + (r.unlocks_count ?? 0),
          revenue: a.revenue + Number(r.net_credits ?? 0),
        }),
        { unlocks: 0, revenue: 0 },
      );
      setStats({
        leads: leads ?? 0,
        unlocks: totals.unlocks,
        revenue: totals.revenue,
        pending: pending ?? 0,
      });
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