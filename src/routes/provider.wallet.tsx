import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRoleGuard } from "@/lib/use-role-guard";
import { CREDIT_PACKAGES, listCreditPackages, getWallet, listTransactions, listMyTopups, submitTopup, fmt, type CreditPackage } from "@/lib/wallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, Plus, CheckCircle2, Clock, XCircle, Sparkles } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/provider/wallet")({
  component: WalletPage,
  head: () => ({ meta: [{ title: "Wallet — Fixido" }] }),
});

function WalletPage() {
  const { user, roles, loading } = useAuth();
  const guard = useRoleGuard("provider");
  const nav = useNavigate();
  const { lang } = useI18n();
  const L = (en: string, my: string) => (lang === "en" ? en : my);
  const [wallet, setWallet] = useState<any>(null);
  const [txs, setTxs] = useState<any[]>([]);
  const [topups, setTopups] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<CreditPackage | null>(null);
  const [packages, setPackages] = useState<CreditPackage[]>(CREDIT_PACKAGES);
  const [customOpen, setCustomOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [ref, setRef] = useState("");
  const [methods, setMethods] = useState<any[]>([]);
  const [methodSlug, setMethodSlug] = useState<string>("kbzpay");
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
    if (!guard.allowed) return;
    if (!user) return;
    refresh();
    (async () => {
      const { data } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("is_active", true)
        .order("slug");
      setMethods(data ?? []);
      if (data && data.length && !data.find((m) => m.slug === "kbzpay")) {
        setMethodSlug(data[0].slug);
      }
    })();
    listCreditPackages().then(setPackages).catch(() => {});
  }, [guard.allowed, user]);

  // Render shell immediately; individual sections handle their own empty state.

  const balance = wallet?.balance_credits ?? 0;
  const lowBalance = balance < 1500;
  const selectedMethod = methods.find((m) => m.slug === methodSlug);
  const qrValue = (selectedMethod?.qr_payload?.trim() || selectedMethod?.phone_number?.trim() || "");
  const qrImage = selectedMethod?.qr_image_url || "";
  const hasQr = !!qrImage || !!qrValue;
  const pendingTopups = topups.filter((t) => t.status === "pending");

  const MIN_CUSTOM = 5000;
  const customMmk = Math.max(0, Math.round((Number(customAmount) || 0) / 1000) * 1000);

  const openCustom = () => {
    if (customMmk < MIN_CUSTOM) return toast.error(L(`Minimum top-up is ${fmt(MIN_CUSTOM)} MMK`, `အနည်းဆုံး ဖြည့်ငွေ ${fmt(MIN_CUSTOM)} ကျပ် ဖြစ်သည်`));
    setPicked({
      id: "custom",
      slug: "custom",
      name: "Custom amount",
      mmk: customMmk,
      credits: customMmk,
      bonus: 0,
      total: customMmk,
    });
    setCustomOpen(false);
  };

  const handleSubmit = async () => {
    if (!picked || !user) return;
    if (!ref.trim()) return toast.error(L("Enter the transaction reference", "ငွေလွှဲ reference ထည့်ပါ"));
    if (!selectedMethod) return toast.error(L("Select a payment method", "ငွေပေးချေမှု နည်းလမ်း ရွေးပါ"));
    setBusy(true);
    try {
      await submitTopup({
        providerId: user.id,
        pkg: picked,
        paymentMethod: selectedMethod.label,
        paymentReference: ref.trim(),
        proofFile: file,
      });
      toast.success(L("Top-up submitted. Admin will review shortly.", "ဖြည့်သွင်းမှု တင်ပြီး။ Admin မကြာမီ စစ်ဆေးမည်။"));
      setPicked(null); setRef(""); setFile(null);
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? L("Failed to submit", "တင်မရ"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">{L("Wallet", "ပိုက်ဆံအိတ်")}</h1>
          <Link to="/provider/leads" className="text-sm text-primary hover:underline">{L("View leads →", "Lead များ →")}</Link>
        </div>

        {/* Balance card — gradient hero */}
        <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-6 text-primary-foreground shadow-lg">
          <div className="flex items-center gap-2 text-xs opacity-80">
            <Wallet className="h-4 w-4" /> {L("Wallet balance", "ပိုက်ဆံအိတ် လက်ကျန်")}
          </div>
          <div className="mt-2 text-4xl font-bold tabular-nums">
            {!wallet ? "—" : fmt(balance)}
          </div>
          <div className="mt-1 text-xs opacity-75">{L("Available credits (1 credit = 1 MMK)", "ရရှိနိုင်သော credits (1 credit = 1 ကျပ်)")}</div>
          {lowBalance && wallet && (
            <p className="mt-3 text-xs rounded-md bg-destructive/30 px-2 py-1 inline-block">⚠ {L("Low balance — top up to keep unlocking leads.", "လက်ကျန် နည်းနေ — Lead ဆက်ဖွင့်ရန် ဖြည့်ပါ။")}</p>
          )}
        </div>

        {pendingTopups.length > 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-semibold">{pendingTopups.length} {L(`top-up${pendingTopups.length>1?"s":""} pending review`, `ဖြည့်သွင်းမှု စစ်ဆေးဆဲ`)}</div>
              <div className="opacity-80">{L("Credits will appear after admin approval — usually within a few hours.", "Admin အတည်ပြုပြီးနောက် credits ပေါ်လာမည် — ပုံမှန်အားဖြင့် နာရီအနည်းငယ်အတွင်း။")}</div>
            </div>
          </div>
        )}

        {/* Packages */}
        <section>
          <h2 className="mb-3 text-base font-semibold">{L("Credit packages", "Credit ပက်ကေ့ချ်")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {packages.map((p) => (
              <div key={p.id} className={`relative rounded-2xl border p-4 ${p.popular ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                {p.badge && (
                  <span className="absolute -top-2 right-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    <Sparkles className="inline h-3 w-3" /> {p.badge}
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
            <button
              onClick={() => { setCustomAmount(""); setCustomOpen(true); }}
              className="rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-4 text-left transition hover:bg-primary/10"
            >
              <div className="text-sm font-semibold text-primary">{L("Custom amount", "ပမာဏ ကိုယ်တိုင်သတ်မှတ်")}</div>
              <div className="mt-1 text-xs text-muted-foreground">{L(`Multiples of 1,000 — minimum ${fmt(MIN_CUSTOM)} MMK`, `1,000 ၏ ဆတိုး — အနည်းဆုံး ${fmt(MIN_CUSTOM)} ကျပ်`)}</div>
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary"><Plus className="h-3 w-3" /> {L("Enter amount", "ပမာဏ ထည့်ပါ")}</div>
            </button>
          </div>
        </section>

        {/* Pending top-ups */}
        {topups.length > 0 && (
          <section>
            <h2 className="mb-3 text-base font-semibold">{L("My top-ups", "ကျွန်ုပ်၏ ဖြည့်သွင်းမှုများ")}</h2>
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
              {topups.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                  <div>
                    <div className="font-medium">{t.package_name} · {fmt(t.total_credits)} credits</div>
                    <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()} · {L("Ref", "Ref")}: {t.payment_reference || "—"}</div>
                    {t.admin_notes && <div className="text-xs text-muted-foreground">{L("Note", "မှတ်ချက်")}: {t.admin_notes}</div>}
                  </div>
                  <StatusBadge status={t.status} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Transactions */}
        <section>
          <h2 className="mb-3 text-base font-semibold">{L("Transaction history", "ငွေလွှဲမှတ်တမ်း")}</h2>
          {txs.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              {L("No transactions yet.", "ငွေပေးချေမှု မရှိသေး။")}
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
                    <div className="text-[10px] text-muted-foreground">{L("bal", "လက်ကျန်")} {fmt(t.balance_after)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {/* Custom amount picker */}
      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{L("Custom top-up amount", "ပမာဏ ကိုယ်တိုင်သတ်မှတ်")}</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <Label>{L("Amount (MMK)", "ပမာဏ (ကျပ်)")}</Label>
            <Input
              type="number"
              inputMode="numeric"
              min={MIN_CUSTOM}
              step={1000}
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="50000"
            />
            <p className="text-xs text-muted-foreground">
              {L("Rounded to nearest 1,000 — min", "1,000 ၏ ဆတိုး — အနည်းဆုံး")} {fmt(MIN_CUSTOM)} MMK.{" "}
              {customMmk > 0 && <span className="font-semibold text-primary">→ {fmt(customMmk)} MMK = {fmt(customMmk)} credits</span>}
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCustomOpen(false)}>{L("Cancel", "ပယ်ဖျက်")}</Button>
            <Button onClick={openCustom} disabled={customMmk < MIN_CUSTOM}>{L("Continue", "ဆက်လုပ်")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!picked} onOpenChange={(o) => !o && setPicked(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{picked?.name} — {fmt(picked?.mmk ?? 0)} MMK</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <Label>{L("Payment method", "ငွေပေးချေမှု နည်းလမ်း")}</Label>
              <select className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={methodSlug} onChange={(e) => setMethodSlug(e.target.value)}>
                {methods.length === 0 && <option value="">{L("No methods configured", "နည်းလမ်း မသတ်မှတ်ရသေး")}</option>}
                {methods.map((m) => <option key={m.slug} value={m.slug}>{m.label}</option>)}
              </select>
            </div>
            {selectedMethod && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                {hasQr ? (
                  <>
                    <div className="flex justify-center rounded-md bg-white p-3">
                      {qrImage ? (
                        <img src={qrImage} alt={`${selectedMethod.label} QR`} className="h-40 w-40 object-contain" />
                      ) : (
                        <QRCodeSVG value={qrValue} size={160} />
                      )}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {L("Scan in", "တွင် Scan ဖတ်ပြီး ငွေပေးပါ")} {selectedMethod.label} <strong>{fmt(picked?.mmk ?? 0)} MMK</strong>
                    </p>
                    {selectedMethod.phone_number && (
                      <p className="text-xs">📱 {selectedMethod.phone_number}{selectedMethod.account_name ? ` · ${selectedMethod.account_name}` : ""}</p>
                    )}
                    {selectedMethod.instructions && <p className="mt-1 text-xs text-muted-foreground">{selectedMethod.instructions}</p>}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">{L("Admin hasn't configured this method yet. Pick another or contact support.", "Admin မသတ်မှတ်ရသေး။ အခြားနည်းလမ်း ရွေးပါ သို့ ဆက်သွယ်ပါ။")}</p>
                )}
              </div>
            )}
            <div>
              <Label>{L("Transaction reference", "ငွေလွှဲ Reference")}</Label>
              <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. KBZ123456789" />
            </div>
            <div>
              <Label>{L("Payment proof (screenshot) *", "ငွေပေးချေမှု သက်သေ (ဖန်သားပြင်ရိုက်)")}</Label>
              <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <p className="mt-1 text-[11px] text-muted-foreground">{L("Credits will be added only after admin approves your proof.", "Admin သက်သေ အတည်ပြုမှသာ credits ပေါင်းမည်။")}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPicked(null)}>{L("Cancel", "ပယ်ဖျက်")}</Button>
            <Button onClick={handleSubmit} disabled={busy || !file || !hasQr}>{busy ? L("Submitting…", "တင်နေ…") : L("Submit for approval", "အတည်ပြုချက် တင်ပါ")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { lang } = useI18n();
  const map: Record<string, { c: string; Icon: any; label: string }> = {
    pending: { c: "bg-amber-500/15 text-amber-600 dark:text-amber-400", Icon: Clock, label: lang === "en" ? "Pending" : "ဆဲ" },
    approved: { c: "bg-green-500/15 text-green-600 dark:text-green-400", Icon: CheckCircle2, label: lang === "en" ? "Approved" : "အတည်ပြု" },
    rejected: { c: "bg-destructive/10 text-destructive", Icon: XCircle, label: lang === "en" ? "Rejected" : "ငြင်းပယ်" },
  };
  const it = map[status] ?? map.pending;
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${it.c}`}><it.Icon className="h-3 w-3" />{it.label}</span>;
}
