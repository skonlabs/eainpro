import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { fmt } from "@/lib/wallet";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin — Eain Pro" }] }),
});

type ProviderRow = {
  id: string;
  business_name: string | null;
  is_verified: boolean;
  is_suspended: boolean;
  rating_avg: number;
  jobs_completed: number;
  created_at: string;
};

function AdminPage() {
  const { lang } = useI18n();
  const { user, roles, loading } = useAuth();
  const nav = useNavigate();
  const isAdmin = roles.includes("admin");

  useEffect(() => {
    if (loading) return;
    if (!user) nav({ to: "/signin", search: { redirect: "/admin" } });
  }, [loading, user, nav]);

  if (loading || !user) return null;
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background p-8 text-center">
        <h1 className="text-xl font-bold">Admin only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {lang === "en"
            ? "Your account does not have the admin role."
            : "သင်၏ အကောင့်တွင် admin role မရှိပါ။"}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Admin console</h1>
        <Tabs defaultValue="overview">
          <TabsList className="flex w-full flex-wrap gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pricing">Lead pricing</TabsTrigger>
            <TabsTrigger value="topups">Top-ups</TabsTrigger>
            <TabsTrigger value="refunds">Refunds</TabsTrigger>
            <TabsTrigger value="providers">Providers</TabsTrigger>
          </TabsList>
          <TabsContent value="overview"><OverviewTab /></TabsContent>
          <TabsContent value="pricing"><PricingTab /></TabsContent>
          <TabsContent value="topups"><TopupsTab /></TabsContent>
          <TabsContent value="refunds"><RefundsTab /></TabsContent>
          <TabsContent value="providers"><ProvidersTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function OverviewTab() {
  const [stats, setStats] = useState<any>(null);
  useEffect(() => {
    (async () => {
      const [{ count: leads }, { count: unlocks }, { data: rev }, { count: pending }] = await Promise.all([
        supabase.from("customer_leads").select("*", { head: true, count: "exact" }),
        supabase.from("provider_lead_unlocks").select("*", { head: true, count: "exact" }),
        supabase.from("provider_wallet_transactions").select("amount_credits").eq("transaction_type", "unlock"),
        supabase.from("provider_credit_topups").select("*", { head: true, count: "exact" }).eq("status", "pending"),
      ]);
      const revenue = (rev ?? []).reduce((s, r) => s + Math.abs(r.amount_credits), 0);
      setStats({ leads: leads ?? 0, unlocks: unlocks ?? 0, revenue, pending: pending ?? 0 });
    })();
  }, []);
  if (!stats) return <Skeleton className="mt-4 h-32 w-full" />;
  const cards = [
    { k: "Leads", v: stats.leads },
    { k: "Unlocks", v: stats.unlocks },
    { k: "Revenue (credits)", v: fmt(stats.revenue) },
    { k: "Pending top-ups", v: stats.pending },
  ];
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => (
        <div key={c.k} className="rounded-2xl border border-border bg-card p-4">
          <div className="text-2xl font-bold">{c.v}</div>
          <div className="text-xs text-muted-foreground">{c.k}</div>
        </div>
      ))}
    </div>
  );
}

function PricingTab() {
  const [rows, setRows] = useState<any[] | null>(null);
  const load = async () => {
    const { data } = await supabase
      .from("lead_pricing")
      .select("*, service_types(category_slug, slug, name_en, is_active)")
      .order("price_credits", { ascending: true });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);
  const save = async (id: string, patch: any) => {
    const { error } = await supabase.from("lead_pricing").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Saved");
    load();
  };
  if (!rows) return <Skeleton className="mt-4 h-64 w-full" />;
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase">
          <tr>
            <th className="p-3">Service</th>
            <th className="p-3">Price (credits)</th>
            <th className="p-3">Max unlocks</th>
            <th className="p-3">Refund</th>
            <th className="p-3">Active</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <PricingRow key={r.id} row={r} onSave={save} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PricingRow({ row, onSave }: { row: any; onSave: (id: string, p: any) => void }) {
  const [price, setPrice] = useState(row.price_credits);
  const [max, setMax] = useState(row.max_provider_unlocks);
  return (
    <tr className="border-t border-border">
      <td className="p-3">
        <div className="font-medium">{row.service_types?.name_en ?? "—"}</div>
        <div className="text-xs text-muted-foreground">{row.service_types?.category_slug}/{row.service_types?.slug}</div>
      </td>
      <td className="p-3">
        <Input type="number" className="w-28" value={price} onChange={(e) => setPrice(parseInt(e.target.value || "0", 10))} onBlur={() => price !== row.price_credits && onSave(row.id, { price_credits: price })} />
      </td>
      <td className="p-3">
        <Input type="number" className="w-20" value={max} onChange={(e) => setMax(parseInt(e.target.value || "1", 10))} onBlur={() => max !== row.max_provider_unlocks && onSave(row.id, { max_provider_unlocks: max })} />
      </td>
      <td className="p-3">
        <Switch checked={row.refund_allowed} onCheckedChange={(v) => onSave(row.id, { refund_allowed: v })} />
      </td>
      <td className="p-3">
        <Switch checked={row.is_active} onCheckedChange={(v) => onSave(row.id, { is_active: v })} />
      </td>
    </tr>
  );
}

function TopupsTab() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [filter, setFilter] = useState<"pending"|"approved"|"rejected">("pending");
  const load = async () => {
    const { data } = await supabase
      .from("provider_credit_topups")
      .select("*, providers(business_name)")
      .eq("status", filter)
      .order("created_at", { ascending: false })
      .limit(100);
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, [filter]);
  const approve = async (id: string) => {
    const { data, error } = await supabase.rpc("approve_topup", { p_topup_id: id, p_notes: null });
    if (error) toast.error(error.message);
    else if (!data?.ok) toast.error(data?.error ?? "Failed");
    else toast.success("Approved");
    load();
  };
  const reject = async (id: string) => {
    const reason = window.prompt("Rejection note (optional):") ?? "";
    const { data, error } = await supabase.rpc("reject_topup", { p_topup_id: id, p_notes: reason || null });
    if (error) toast.error(error.message);
    else if (!data?.ok) toast.error(data?.error ?? "Failed");
    else toast.success("Rejected");
    load();
  };
  return (
    <div className="mt-4 space-y-3">
      <div className="flex gap-2">
        {(["pending","approved","rejected"] as const).map((s) => (
          <Button key={s} size="sm" variant={filter===s?"default":"outline"} onClick={() => setFilter(s)}>{s}</Button>
        ))}
      </div>
      {!rows ? <Skeleton className="h-48 w-full" /> :
        rows.length === 0 ? <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">No {filter} top-ups.</p> :
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {rows.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="font-medium">{t.providers?.business_name ?? t.provider_id.slice(0,8)} · {t.package_name}</div>
                <div className="text-xs text-muted-foreground">
                  {fmt(t.payment_amount_mmk)} MMK → {fmt(t.total_credits)} credits · {t.payment_method ?? "—"} · ref {t.payment_reference ?? "—"}
                </div>
                <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
                {t.payment_proof_url && (
                  <button className="mt-1 text-xs text-primary underline" onClick={async () => {
                    const { data } = await supabase.storage.from("topup-proofs").createSignedUrl(t.payment_proof_url, 300);
                    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                  }}>View proof</button>
                )}
              </div>
              {filter === "pending" && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => reject(t.id)}>Reject</Button>
                  <Button size="sm" onClick={() => approve(t.id)}>Approve</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      }
    </div>
  );
}

function RefundsTab() {
  const [unlocks, setUnlocks] = useState<any[] | null>(null);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<any>(null);
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState("");
  const load = async () => {
    let query = supabase
      .from("provider_lead_unlocks")
      .select("*, customer_leads(customer_name, customer_phone, city_slug, service_type_id), providers(business_name)")
      .order("unlocked_at", { ascending: false })
      .limit(50);
    if (q.trim()) {
      // simple filter by provider business_name or phone
      query = query as any;
    }
    const { data } = await query;
    setUnlocks(data ?? []);
  };
  useEffect(() => { load(); }, []);
  const filtered = (unlocks ?? []).filter((u) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return u.providers?.business_name?.toLowerCase().includes(s)
      || u.customer_leads?.customer_phone?.includes(s)
      || u.customer_leads?.customer_name?.toLowerCase().includes(s);
  });
  const submit = async () => {
    if (!picked || !amount || !reason.trim()) return toast.error("Amount and reason required");
    const { data, error } = await supabase.rpc("refund_unlock", { p_unlock_id: picked.id, p_amount: amount, p_reason: reason });
    if (error) toast.error(error.message);
    else if (!data?.ok) toast.error(data?.error ?? "Failed");
    else { toast.success("Refunded"); setPicked(null); setAmount(0); setReason(""); load(); }
  };
  return (
    <div className="mt-4 space-y-3">
      <Input placeholder="Search by provider name, customer name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
      {!unlocks ? <Skeleton className="h-48 w-full" /> :
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {filtered.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div>
                <div className="font-medium">{u.providers?.business_name ?? u.provider_id.slice(0,8)} → {u.customer_leads?.customer_name}</div>
                <div className="text-xs text-muted-foreground">
                  {fmt(u.unlock_price_credits)} credits · refunded {fmt(u.refunded_amount_credits)} · {u.status}
                </div>
              </div>
              <Button size="sm" variant="outline" disabled={u.refunded_amount_credits >= u.unlock_price_credits} onClick={() => { setPicked(u); setAmount(u.unlock_price_credits - u.refunded_amount_credits); }}>
                Refund
              </Button>
            </li>
          ))}
        </ul>
      }
      <Dialog open={!!picked} onOpenChange={(o) => !o && setPicked(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Issue refund</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <label className="text-xs font-medium">Amount (credits)</label>
              <Input type="number" value={amount} onChange={(e) => setAmount(parseInt(e.target.value || "0", 10))} />
            </div>
            <div>
              <label className="text-xs font-medium">Reason</label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Invalid phone, duplicate lead, etc." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPicked(null)}>Cancel</Button>
            <Button onClick={submit}>Refund {fmt(amount)} credits</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProvidersTab() {
  const { lang } = useI18n();
  const [providers, setProviders] = useState<ProviderRow[] | null>(null);
  const refresh = async () => {
    const { data } = await supabase
      .from("providers")
      .select("id, business_name, is_verified, is_suspended, rating_avg, jobs_completed, created_at")
      .order("created_at", { ascending: false });
    setProviders((data ?? []) as ProviderRow[]);
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
          </div>
        </li>
      ))}
    </ul>
  );
}
