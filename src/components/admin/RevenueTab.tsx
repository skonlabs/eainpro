import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { fmt } from "@/lib/wallet";
import { toast } from "sonner";

type ByService = {
  service_type_id: string | null;
  name_en: string | null;
  slug: string | null;
  category_slug: string | null;
  unlocks_count: number;
  gross_credits: number;
  refunded_credits: number;
  net_credits: number;
};
type Daily = { day: string; unlocks_count: number; net_credits: number };
type Totals = { unlocks: number; gross: number; refunded: number; net: number };
type RecentUnlock = {
  unlock_id: string;
  unlocked_at: string;
  service_name_en: string | null;
  category_slug: string | null;
  slug: string | null;
  provider_id: string | null;
  provider_name: string | null;
  customer_id: string | null;
  customer_name: string | null;
  gross_credits: number;
  refunded_credits: number;
  net_credits: number;
};

export function RevenueTab() {
  const [totals, setTotals] = useState<Totals | null>(null);
  const [byService, setByService] = useState<ByService[] | null>(null);
  const [daily, setDaily] = useState<Daily[] | null>(null);
  const [recent, setRecent] = useState<RecentUnlock[] | null>(null);

  useEffect(() => {
    (async () => {
      // Single SECURITY DEFINER RPC. Aggregates in Postgres so the totals
      // here always agree with Overview's get_admin_overview, regardless of
      // unlock volume (the previous client-side aggregation silently capped
      // at supabase-js's default 1000-row .select() limit).
      const { data, error } = await supabase.rpc("get_admin_revenue");
      if (error) {
        toast.error(error.message);
        setTotals({ unlocks: 0, gross: 0, refunded: 0, net: 0 });
        setByService([]);
        setDaily([]);
        setRecent([]);
        return;
      }
      const d = (data ?? {}) as {
        totals?: Totals;
        by_service?: ByService[];
        daily?: Daily[];
        recent_unlocks?: RecentUnlock[];
      };
      setTotals(d.totals ?? { unlocks: 0, gross: 0, refunded: 0, net: 0 });
      setByService(d.by_service ?? []);
      setDaily(d.daily ?? []);
      setRecent(d.recent_unlocks ?? []);
    })();
  }, []);

  if (!totals || !byService || !daily || !recent) return <Skeleton className="mt-4 h-64 w-full" />;
  const maxNet = Math.max(1, ...byService.map((r) => Number(r.net_credits ?? 0)));

  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { k: "Unlocks", v: totals.unlocks },
          { k: "Gross credits", v: fmt(totals.gross) },
          { k: "Net credits", v: fmt(totals.net) },
        ].map((c) => (
          <div key={c.k} className="rounded-2xl border border-border bg-card p-4">
            <div className="text-xl font-bold">{c.v}</div>
            <div className="text-xs text-muted-foreground">{c.k}</div>
          </div>
        ))}
      </div>
      <section>
        <h3 className="mb-2 text-sm font-semibold">Revenue by service (all time)</h3>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase">
              <tr>
                <th className="p-3">Service</th>
                <th className="p-3">Unlocks</th>
                <th className="p-3">Gross</th>
                <th className="p-3">Refunded</th>
                <th className="p-3">Net</th>
                <th className="p-3 w-1/3">Share</th>
              </tr>
            </thead>
            <tbody>
              {byService.filter((r) => r.unlocks_count > 0).map((r) => (
                <tr key={r.service_type_id ?? r.slug ?? "x"} className="border-t border-border">
                  <td className="p-3">
                    <div className="font-medium">{r.name_en ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{r.category_slug ?? "—"}/{r.slug ?? "—"}</div>
                  </td>
                  <td className="p-3">{r.unlocks_count}</td>
                  <td className="p-3">{fmt(r.gross_credits)}</td>
                  <td className="p-3 text-amber-600">{fmt(r.refunded_credits)}</td>
                  <td className="p-3 font-semibold">{fmt(r.net_credits)}</td>
                  <td className="p-3">
                    <div className="h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.round((Number(r.net_credits) / maxNet) * 100)}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
              {byService.filter((r) => r.unlocks_count > 0).length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">No revenue yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold">Last 30 days</h3>
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {daily.length === 0 ? (
            <li className="p-6 text-center text-sm text-muted-foreground">No unlocks in the last 30 days.</li>
          ) : daily.map((d) => (
            <li key={d.day} className="flex items-center justify-between p-3 text-sm">
              <span>{new Date(d.day).toLocaleDateString()}</span>
              <span className="text-muted-foreground">{d.unlocks_count} unlocks</span>
              <span className="font-semibold">{fmt(d.net_credits)} credits</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold">Recent unlocks (latest 100)</h3>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase">
              <tr>
                <th className="p-3">When</th>
                <th className="p-3">Service</th>
                <th className="p-3">Provider</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Gross</th>
                <th className="p-3">Refunded</th>
                <th className="p-3">Net</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr><td colSpan={7} className="p-6 text-center text-sm text-muted-foreground">No unlocks yet.</td></tr>
              ) : recent.map((u) => (
                <tr key={u.unlock_id} className="border-t border-border">
                  <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(u.unlocked_at).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{u.service_name_en ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{u.category_slug ?? "—"}/{u.slug ?? "—"}</div>
                  </td>
                  <td className="p-3">{u.provider_name ?? "—"}</td>
                  <td className="p-3">{u.customer_name ?? "—"}</td>
                  <td className="p-3">{fmt(u.gross_credits)}</td>
                  <td className="p-3 text-amber-600">{fmt(u.refunded_credits)}</td>
                  <td className="p-3 font-semibold">{fmt(u.net_credits)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
