import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";

export function AuditTab() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("admin_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      setRows(data ?? []);
    })();
  }, []);
  if (!rows) return <Skeleton className="mt-4 h-64 w-full" />;
  if (rows.length === 0) return <p className="mt-4 rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">No admin actions logged yet.</p>;
  return (
    <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
      {rows.map((r) => (
        <li key={r.id} className="p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">{r.action}</span>
            <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {r.target_table ?? "—"} · {r.target_id ? r.target_id.slice(0, 8) : "—"} · admin {r.admin_id.slice(0, 8)}
          </div>
          {r.metadata && <pre className="mt-1 overflow-x-auto rounded-md bg-muted/50 p-2 text-[11px]">{JSON.stringify(r.metadata, null, 0)}</pre>}
        </li>
      ))}
    </ul>
  );
}