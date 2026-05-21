import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export function LeadsTab() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [filter, setFilter] = useState<"all"|"open"|"booked"|"cancelled"|"completed"|"expired">("all");
  const [q, setQ] = useState("");
  const load = async () => {
    setRows(null);
    let query = supabase
      .from("customer_leads")
      .select("id, short_description, customer_name, customer_phone, city_slug, status, created_at, customer_id, category_slug, service_type_slug")
      .order("created_at", { ascending: false })
      .limit(200);
    if (filter !== "all") query = query.eq("status", filter);
    const { data, error } = await query;
    if (error) { toast.error(error.message); setRows([]); return; }
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, [filter]);
  const setStatus = async (id: string, status: string) => {
    if (!confirm(`Set lead status to "${status}"?`)) return;
    const { error } = await supabase.from("customer_leads").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Updated"); load(); }
  };
  const filtered = (rows ?? []).filter((r) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return r.short_description?.toLowerCase().includes(s)
      || r.customer_name?.toLowerCase().includes(s)
      || r.customer_phone?.includes(s)
      || r.city_slug?.toLowerCase().includes(s);
  });
  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {(["all","open","booked","completed","cancelled","expired"] as const).map((s) => (
          <Button key={s} size="sm" variant={filter===s?"default":"outline"} onClick={() => setFilter(s)}>{s}</Button>
        ))}
      </div>
      <Input placeholder="Search description, name, phone, city" value={q} onChange={(e) => setQ(e.target.value)} />
      {!rows ? <Skeleton className="h-48 w-full" /> :
        filtered.length === 0 ? <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">No leads.</p> :
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {filtered.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{l.short_description}</div>
                <div className="text-xs text-muted-foreground">
                  {l.customer_name ?? "—"} · {l.customer_phone ?? "—"} · {l.city_slug} · {l.category_slug}/{l.service_type_slug}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {new Date(l.created_at).toLocaleString()} · <span className="font-semibold">{l.status}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {l.status !== "expired" && (
                  <Button size="sm" variant="outline" onClick={() => setStatus(l.id, "expired")}>Expire</Button>
                )}
                {l.status !== "cancelled" && (
                  <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => setStatus(l.id, "cancelled")}>Cancel</Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      }
    </div>
  );
}