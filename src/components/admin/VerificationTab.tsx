import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export function VerificationTab() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [previewing, setPreviewing] = useState<{ url: string; row: any } | null>(null);
  const load = async () => {
    setRows(null);
    let q = supabase
      .from("provider_documents")
      .select("id, provider_id, kind, storage_path, status, review_note, created_at, reviewed_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) { toast.error(error.message); setRows([]); return; }
    const list = data ?? [];
    const provIds = [...new Set(list.map((r: any) => r.provider_id))];
    const { data: provs } = provIds.length
      ? await supabase.from("providers").select("id, business_name, is_verified").in("id", provIds)
      : { data: [] as any[] };
    const map = new Map((provs ?? []).map((p: any) => [p.id, p]));
    setRows(list.map((r: any) => ({ ...r, provider: map.get(r.provider_id) })));
  };
  useEffect(() => { load(); }, [filter]);

  const openPreview = async (row: any) => {
    const { data, error } = await supabase.storage.from("provider-documents").createSignedUrl(row.storage_path, 300);
    if (error || !data?.signedUrl) return toast.error(error?.message ?? "Could not load file");
    setPreviewing({ url: data.signedUrl, row });
  };

  const setStatus = async (row: any, status: "approved" | "rejected") => {
    const note = status === "rejected" ? (prompt("Reason?") ?? null) : null;
    const { error } = await supabase
      .from("provider_documents")
      .update({ status, review_note: note, reviewed_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success(status);
    setPreviewing(null);
    load();
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="flex gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full border px-3 py-1 text-xs font-medium ${filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>{f}</button>
        ))}
      </div>
      {!rows ? <Skeleton className="h-48 w-full" /> :
        rows.length === 0 ? <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No documents.</p> :
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <div className="min-w-0">
                <div className="font-medium">{r.provider?.business_name ?? r.provider_id.slice(0, 8)}{r.provider?.is_verified && <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">Verified</span>}</div>
                <div className="text-xs text-muted-foreground">{r.kind} · {new Date(r.created_at).toLocaleDateString()} · {r.status}</div>
                {r.review_note && <p className="text-xs text-destructive">{r.review_note}</p>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openPreview(r)}>View</Button>
                {r.status !== "approved" && <Button size="sm" onClick={() => setStatus(r, "approved")}>Approve</Button>}
                {r.status !== "rejected" && <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => setStatus(r, "rejected")}>Reject</Button>}
              </div>
            </li>
          ))}
        </ul>
      }
      <Dialog open={!!previewing} onOpenChange={(o) => !o && setPreviewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{previewing?.row?.kind}</DialogTitle></DialogHeader>
          {previewing && (
            previewing.row.storage_path.endsWith(".pdf")
              ? <iframe src={previewing.url} className="h-[70vh] w-full rounded-md border border-border" />
              : <img src={previewing.url} alt="" className="max-h-[70vh] w-full rounded-md object-contain" />
          )}
          <DialogFooter>
            {previewing && previewing.row.status !== "approved" && <Button onClick={() => setStatus(previewing.row, "approved")}>Approve</Button>}
            {previewing && previewing.row.status !== "rejected" && <Button variant="outline" onClick={() => setStatus(previewing.row, "rejected")}>Reject</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}