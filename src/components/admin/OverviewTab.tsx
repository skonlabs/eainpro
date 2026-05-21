import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { fmt } from "@/lib/wallet";
import { toast } from "sonner";

type Stats = { leads: number; unlocks: number; revenue: number; pending: number };

export function OverviewTab({ onJump }: { onJump: (tab: string) => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    (async () => {
      // Single RPC reads each counter directly from its source table.
      // Avoids the supabase-js 1000-row SELECT cap and view-join drift
      // that produced wrong totals before.
      const { data, error } = await supabase.rpc("get_admin_overview");
      if (error) {
        toast.error(error.message);
        setStats({ leads: 0, unlocks: 0, revenue: 0, pending: 0 });
        return;
      }
      const d = (data ?? {}) as {
        leads?: number;
        unlocks?: number;
        net_revenue?: number;
        pending_topups?: number;
      };
      setStats({
        leads: Number(d.leads ?? 0),
        unlocks: Number(d.unlocks ?? 0),
        revenue: Number(d.net_revenue ?? 0),
        pending: Number(d.pending_topups ?? 0),
      });
    })();
  }, []);
  if (!stats) return <Skeleton className="mt-4 h-32 w-full" />;
  const cards = [
    { k: "Leads", v: stats.leads, tab: "leads" },
    { k: "Unlocks", v: stats.unlocks, tab: "revenue" },
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