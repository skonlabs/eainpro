import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { BlockUserDialog } from "./BlockUserDialog";

type ProviderRow = {
  id: string;
  business_name: string | null;
  is_verified: boolean;
  is_suspended: boolean;
  rating_avg: number;
  jobs_completed: number;
  created_at: string;
  is_blocked?: boolean;
  block_type?: "soft" | "hard" | null;
};

export function ProvidersTab() {
  const { lang } = useI18n();
  const [providers, setProviders] = useState<ProviderRow[] | null>(null);
  const refresh = async () => {
    const { data } = await supabase
      .from("providers")
      .select("id, business_name, is_verified, is_suspended, rating_avg, jobs_completed, created_at")
      .order("created_at", { ascending: false });
    const list = (data ?? []) as ProviderRow[];
    if (list.length > 0) {
      const ids = list.map((p) => p.id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, is_blocked, block_type")
        .in("id", ids);
      const map = new Map((profs ?? []).map((p) => [p.id, p]));
      for (const p of list) {
        const pr = map.get(p.id) as { is_blocked?: boolean; block_type?: "soft" | "hard" | null } | undefined;
        p.is_blocked = !!pr?.is_blocked;
        p.block_type = pr?.block_type ?? null;
      }
    }
    setProviders(list);
  };
  useEffect(() => { refresh(); }, []);
  const setVerified = async (id: string, v: boolean) => {
    const { error } = await supabase.from("providers").update({ is_verified: v }).eq("id", id);
    if (error) toast.error(error.message); else toast.success(v ? "Verified" : "Unverified");
    refresh();
  };
  const setSuspended = async (id: string, s: boolean) => {
    const { error } = await supabase.from("providers").update({ is_suspended: s }).eq("id", id);
    if (error) toast.error(error.message); else toast.success(s ? "Suspended" : "Unsuspended");
    refresh();
  };
  if (!providers) return <Skeleton className="mt-4 h-48 w-full" />;
  return (
    <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
      {providers.map((p) => (
        <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{p.business_name ?? "—"}</span>
              {p.is_verified && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Verified</span>}
              {p.is_suspended && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">Suspended</span>}
              {p.is_blocked && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.block_type === "hard" ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-700 dark:text-amber-400"}`}>
                  {p.block_type === "hard" ? "Blocked" : "Suspended"}
                </span>
              )}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">{p.rating_avg.toFixed(1)}★ · {p.jobs_completed} jobs</div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant={p.is_verified ? "outline" : "default"} onClick={() => setVerified(p.id, !p.is_verified)}>
              {p.is_verified ? (lang==="en"?"Unverify":"ပယ်ဖျက်") : (lang==="en"?"Verify":"အတည်ပြု")}
            </Button>
            <Button size="sm" variant="ghost" className={p.is_suspended ? "" : "text-destructive hover:bg-destructive/10"} onClick={() => setSuspended(p.id, !p.is_suspended)}>
              {p.is_suspended ? "Unsuspend" : "Suspend"}
            </Button>
            <BlockUserDialog
              userId={p.id}
              userLabel={p.business_name ?? p.id.slice(0, 8)}
              isBlocked={!!p.is_blocked}
              blockType={p.block_type ?? null}
              onChanged={refresh}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}