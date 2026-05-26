import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export function ReportsTab() {
  const [filter, setFilter] = useState<"open" | "reviewing" | "resolved" | "dismissed" | "all">("all");
  const qc = useQueryClient();
  const { data: rows } = useQuery({
    queryKey: ["admin", "reports", filter],
    queryFn: async () => {
      let q = supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(200);
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) { toast.error(error.message); return []; }
      return data ?? [];
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "reports"] });
  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("reports").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(status); refresh(); }
  };
  return (
    <div className="mt-4 space-y-3">
      <div className="flex gap-2">
        {(["open", "reviewing", "resolved", "dismissed", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full border px-3 py-1 text-xs font-medium ${filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>{f}</button>
        ))}
      </div>
      {!rows ? <Skeleton className="h-48 w-full" /> :
        rows.length === 0 ? <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No reports.</p> :
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {rows.map((r) => (
            <li key={r.id} className="space-y-2 p-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium">[{r.kind ?? "other"}] {r.reporter_id.slice(0,8)} → {r.target_user_id?.slice(0,8) ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()} · status: {r.status}</div>
                </div>
              </div>
              <p className="rounded-md bg-muted p-2 text-xs">{r.reason}</p>
              {r.status !== "resolved" && r.status !== "dismissed" && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "reviewing")}>Mark reviewing</Button>
                  <Button size="sm" onClick={() => setStatus(r.id, "resolved")}>Resolve</Button>
                  <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, "dismissed")}>Dismiss</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      }
    </div>
  );
}