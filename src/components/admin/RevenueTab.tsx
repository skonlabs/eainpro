import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { fmt } from "@/lib/wallet";

export function RevenueTab() {
  const [byService, setByService] = useState<any[] | null>(null);
  const [daily, setDaily] = useState<any[] | null>(null);
  useEffect(() => {
    (async () => {
      const [{ data: s }, { data: d }] = await Promise.all([
        supabase.from("lead_revenue_by_service").select("*").order("net_credits", { ascending: false }),
        supabase.from("lead_revenue_daily").select("*").order("day", { ascending: false }).limit(30),
      ]);
      setByService(s ?? []);
      setDaily(d ?? []);
    })();
  }, []);
  const totals = (byService ?? []).reduce(
    (a, r) => ({ unlocks: a.unlocks + (r.unlocks_count ?? 0), gross: a.gross + Number(r.gross_credits ?? 0), net: a.net + Number(r.net_credits ?? 0) }),
    { unlocks: 0, gross: 0, net: 0 },
  );
  const maxNet = Math.max(1, ...((byService ?? []).map((r) => Number(r.net_credits ?? 0))));
  if (!byService || !daily) return <Skeleton className="mt-4 h-64 w-full" />;
  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[{ k: "Unlocks", v: totals.unlocks }, { k: "Gross credits", v: fmt(totals.gross) }, { k: "Net credits", v: fmt(totals.net) }].map((c) => (
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
              <tr><th className="p-3">Service</th><th className="p-3">Unlocks</th><th className="p-3">Gross</th><th className="p-3">Refunded</th><th className="p-3">Net</th><th className="p-3 w-1/3">Share</th></tr>
            </thead>
            <tbody>
              {byService.filter((r) => r.unlocks_count > 0).map((r) => (
                <tr key={r.service_type_id} className="border-t border-border">
                  <td className="p-3"><div className="font-medium">{r.name_en}</div><div className="text-xs text-muted-foreground">{r.category_slug}/{r.slug}</div></td>
                  <td className="p-3">{r.unlocks_count}</td>
                  <td className="p-3">{fmt(r.gross_credits)}</td>
                  <td className="p-3 text-amber-600">{fmt(r.refunded_credits)}</td>
                  <td className="p-3 font-semibold">{fmt(r.net_credits)}</td>
                  <td className="p-3"><div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${Math.round((Number(r.net_credits) / maxNet) * 100)}%` }} /></div></td>
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
    </div>
  );
}