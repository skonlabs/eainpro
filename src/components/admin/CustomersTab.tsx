import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { BlockUserDialog } from "./BlockUserDialog";
import { useQueryClient } from "@tanstack/react-query";

export function CustomersTab() {
  const [q, setQ] = useState("");
  const qc = useQueryClient();
  const { data: rows } = useQuery({
    queryKey: ["admin", "customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_leads")
        .select("customer_id, customer_name, customer_phone, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) { toast.error(error.message); return []; }
      const map = new Map<string, any>();
      for (const r of data ?? []) {
        if (!r.customer_id) continue;
        const cur = map.get(r.customer_id);
        if (!cur) {
          map.set(r.customer_id, { id: r.customer_id, name: r.customer_name, phone: r.customer_phone, leads: 1, last: r.created_at });
        } else {
          cur.leads += 1;
          if (!cur.name && r.customer_name) cur.name = r.customer_name;
          if (!cur.phone && r.customer_phone) cur.phone = r.customer_phone;
        }
      }
      const list = Array.from(map.values()).sort((a, b) => b.leads - a.leads);
      if (list.length > 0) {
        const ids = list.map((r) => r.id);
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, is_blocked, block_type")
          .in("id", ids);
        const pmap = new Map((profs ?? []).map((p) => [p.id, p]));
        for (const r of list) {
          const pr = pmap.get(r.id) as { is_blocked?: boolean; block_type?: "soft" | "hard" | null } | undefined;
          r.is_blocked = !!pr?.is_blocked;
          r.block_type = pr?.block_type ?? null;
        }
      }
      return list;
    },
  });
  const filtered = (rows ?? []).filter((r) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return r.name?.toLowerCase().includes(s) || r.phone?.includes(s);
  });
  return (
    <div className="mt-4 space-y-3">
      <Input placeholder="Search by name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
      {!rows ? <Skeleton className="h-48 w-full" /> :
        filtered.length === 0 ? <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">No customers found.</p> :
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase">
              <tr><th className="p-3">Name</th><th className="p-3">Phone</th><th className="p-3">Leads</th><th className="p-3">Last activity</th><th className="p-3">Status</th><th className="p-3 text-right">Action</th></tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="p-3 font-medium">{c.name ?? "—"}</td>
                  <td className="p-3"><a href={`tel:${c.phone}`} className="text-primary">{c.phone ?? "—"}</a></td>
                  <td className="p-3">{c.leads}</td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(c.last).toLocaleString()}</td>
                  <td className="p-3">
                    {c.is_blocked ? (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.block_type === "hard" ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-700 dark:text-amber-400"}`}>
                        {c.block_type === "hard" ? "Blocked" : "Suspended"}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Active</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <BlockUserDialog
                      userId={c.id}
                      userLabel={c.name ?? c.phone ?? c.id.slice(0, 8)}
                      isBlocked={!!c.is_blocked}
                      blockType={c.block_type ?? null}
                      onChanged={() => qc.invalidateQueries({ queryKey: ["admin", "customers"] })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    </div>
  );
}