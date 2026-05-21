import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { fmt } from "@/lib/wallet";

type UnlockRow = {
  id: string;
  unlock_price_credits: number | null;
  refunded_amount_credits: number | null;
  unlocked_at: string;
  lead: {
    service_type_id: string | null;
    service_type: { id: string; slug: string | null; name_en: string | null; category_slug: string | null } | { id: string; slug: string | null; name_en: string | null; category_slug: string | null }[] | null;
  } | null;
};

type ByService = { service_type_id: string; name_en: string; slug: string; category_slug: string; unlocks_count: number; gross_credits: number; refunded_credits: number; net_credits: number };
type Daily = { day: string; unlocks_count: number; net_credits: number };

export function RevenueTab() {
  const [unlocks, setUnlocks] = useState<UnlockRow[] | null>(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("provider_lead_unlocks")
        .select("id, unlock_price_credits, refunded_amount_credits, unlocked_at, lead:customer_leads(service_type_id, service_type:service_types(id, slug, name_en, category_slug))")
        .order("unlocked_at", { ascending: false })
        .limit(1000);
      setUnlocks((data ?? []) as unknown as UnlockRow[]);
    })();
  }, []);
  const byService = useMemo<ByService[] | null>(() => {
    if (!unlocks) return null;
    const map = new Map<string, ByService>();
    for (const u of unlocks) {
      const st = Array.isArray(u.lead?.service_type) ? u.lead?.service_type[0] : u.lead?.service_type;
      const id = st?.id ?? u.lead?.service_type_id ?? "unknown";
      const cur = map.get(id) ?? { service_type_id: id, name_en: st?.name_en ?? "—", slug: st?.slug ?? "—", category_slug: st?.category_slug ?? "—", unlocks_count: 0, gross_credits: 0, refunded_credits: 0, net_credits: 0 };
      const gross = Number(u.unlock_price_credits ?? 0);
      const refunded = Number(u.refunded_amount_credits ?? 0);
      cur.unlocks_count += 1;
      cur.gross_credits += gross;
      cur.refunded_credits += refunded;
      cur.net_credits += gross - refunded;
      map.set(id, cur);
    }
    return [...map.values()].sort((a, b) => b.net_credits - a.net_credits);
  }, [unlocks]);
  const daily = useMemo<Daily[] | null>(() => {
    if (!unlocks) return null;
    const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
    const map = new Map<string, Daily>();
    for (const u of unlocks) {
      const t = new Date(u.unlocked_at).getTime();
      if (t < cutoff) continue;
      const day = new Date(u.unlocked_at).toISOString().slice(0, 10);
      const cur = map.get(day) ?? { day, unlocks_count: 0, net_credits: 0 };
      cur.unlocks_count += 1;
      cur.net_credits += Number(u.unlock_price_credits ?? 0) - Number(u.refunded_amount_credits ?? 0);
      map.set(day, cur);
    }
    return [...map.values()].sort((a, b) => (a.day < b.day ? 1 : -1));
  }, [unlocks]);
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