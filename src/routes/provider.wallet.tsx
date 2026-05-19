import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { CREDIT_PACKAGES, getWallet, listTransactions, listMyTopups, submitTopup, fmt, type CreditPackage } from "@/lib/wallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, Plus, CheckCircle2, Clock, XCircle, Sparkles } from "lucide-react";

export const Route = createFileRoute("/provider/wallet")({
  component: WalletPage,
  head: () => ({ meta: [{ title: "Wallet — Eain Pro" }] }),
});

function WalletPage() {
  const { user, roles, loading } = useAuth();
  const nav = useNavigate();
  const [wallet, setWallet] = useState<any>(null);
  const [txs, setTxs] = useState<any[]>([]);
  const [topups, setTopups] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<CreditPackage | null>(null);
  const [ref, setRef] = useState("");
  const [method, setMethod] = useState("KBZPay");
  const [file, setFile] = useState<File | null>(null);

  const refresh = async () => {
    if (!user) return;
    const [w, t, tu] = await Promise.all([
      getWallet(user.id),
      listTransactions(user.id),
      listMyTopups(user.id),
    ]);
    setWallet(w);
    setTxs(t);
    setTopups(tu);
  };

  useEffect(() => {
    if (loading) return;
    if (!user) return void nav({ to: "/signin", search: { redirect: "/provider/wallet" } });
    if (!roles.includes("provider")) return void nav({ to: "/provider/onboarding" });
    refresh();
  }, [loading, user, roles, nav]);

  if (loading || !user) return null;

  const balance = wallet?.balance_credits ?? 0;
  const lowBalance = balance < 1500;

  const handleSubmit = async () => {
    if (!picked) return;
    if (!ref.trim()) return toast.error("Enter the transaction reference");
    setBusy(true);
    try {
      await submitTopup({
        providerId: user.id,
        pkg: picked,
        paymentMethod: method,
        paymentReference: ref.trim(),
        proofFile: file,
      });
      toast.success("Top-up submitted. Admin will review shortly.");
      setPicked(null); setRef(""); setFile(null);
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to submit");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Wallet</h1>
          <Link to="/provider/leads" className="text-sm text-primary hover:underline">View leads →</Link>
        </div>

        {/* Balance card */}
        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 to-primary/5 p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="h-4 w-4" /> Current balance
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            {!wallet ? <Skeleton className="h-10 w-32" /> : (
              <>
                <span className="text-4xl font-bold">{fmt(balance)}</span>
                <span className="text-sm text-muted-foreground">credits ({fmt(balance)} MMK)</span>
              </>
            )}
          </div>
          {lowBalance && wallet && (
            <p className="mt-3 text-xs text-destructive">⚠ Low balance — add credits to keep unlocking leads.</p>
          )}
        </div>

        {/* Packages */}
        <section>
          <h2 className="mb-3 text-base font-semibold">Credit packages</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {CREDIT_PACKAGES.map((p) => (
              <div key={p.id} className={`relative rounded-2xl border p-4 ${p.popular ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                {p.popular && (
                  <span className="absolute -top-2 right-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    <Sparkles className="inline h-3 w-3" /> Best value
                  </span>
                )}
                <div className="text-sm font-semibold">{p.name}</div>
                <div className="mt-1 text-2xl font-bold">{fmt(p.mmk)} MMK</div>
                <div className="mt-1 text-sm">
                  {fmt(p.total)} credits
                  {p.bonus > 0 && <span className="ml-1 text-xs text-green-600 dark:text-green-400">(+{fmt(p.bonus)} bonus)</span>}
                </div>
                <Button className="mt-3 w-full" onClick={() => setPicked(p)}>
                  <Plus className="mr-1 h-4 w-4" /> Buy
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* Pending top-ups */}
        {topups.length > 0 && (
          <section>
            <h2 className="mb-3 text-base font-semibold">My top-ups</h2>
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
              {topups.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                  <div>
                    <div className="font-medium">{t.package_name} · {fmt(t.total_credits)} credits</div>
                    <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()} · Ref: {t.payment_reference || "—"}</div>
                    {t.admin_notes && <div className="text-xs text-muted-foreground">Note: {t.admin_notes}</div>}
                  </div>
                  <StatusBadge status={t.status} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Transactions */}
        <section>
          <h2 className="mb-3 text-base font-semibold">Transaction history</h2>
          {txs.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              No transactions yet.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
              {txs.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                  <div>
                    <div className="font-medium capitalize">{t.transaction_type} {t.description ? `· ${t.description}` : ""}</div>
                    <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
                  </div>
                  <div className={`text-right ${t.amount_credits >= 0 ? "text-green-600 dark:text-green-400" : "text-foreground"}`}>
                    <div className="font-semibold">{t.amount_credits >= 0 ? "+" : ""}{fmt(t.amount_credits)}</div>
                    <div className="text-[10px] text-muted-foreground">bal {fmt(t.balance_after)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <Dialog open={!!picked} onOpenChange={(o) => !o && setPicked(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{picked?.name} — {fmt(picked?.mmk ?? 0)} MMK</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Transfer <strong>{fmt(picked?.mmk ?? 0)} MMK</strong> via KBZPay / Wave / AYAPay to{" "}
              <strong>09-xxx-xxx-xxx</strong>, then enter the transaction reference below. You will get{" "}
              <strong>{fmt(picked?.total ?? 0)} credits</strong> after admin approval.
            </p>
            <div>
              <Label>Payment method</Label>
              <select className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option>KBZPay</option><option>WavePay</option><option>AYAPay</option><option>Bank transfer</option>
              </select>
            </div>
            <div>
              <Label>Transaction reference</Label>
              <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. KBZ123456789" />
            </div>
            <div>
              <Label>Payment proof (optional)</Label>
              <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPicked(null)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={busy}>{busy ? "Submitting…" : "Submit for approval"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { c: string; Icon: any; label: string }> = {
    pending: { c: "bg-amber-500/15 text-amber-600 dark:text-amber-400", Icon: Clock, label: "Pending" },
    approved: { c: "bg-green-500/15 text-green-600 dark:text-green-400", Icon: CheckCircle2, label: "Approved" },
    rejected: { c: "bg-destructive/10 text-destructive", Icon: XCircle, label: "Rejected" },
  };
  const it = map[status] ?? map.pending;
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${it.c}`}><it.Icon className="h-3 w-3" />{it.label}</span>;
}
