import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { listAvailableLeads, listMyUnlocks, unlockLead, updateUnlockStatus, UNLOCK_ERROR_MESSAGES, isCustomerLeadRecursionError, type LeadPreview } from "@/lib/leads";
import { fmt, getWallet } from "@/lib/wallet";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Lock, Unlock, MapPin, Clock, Image as ImageIcon, Phone, Wallet, MessageCircle, AlertTriangle, Send } from "lucide-react";
import { X as XIcon } from "lucide-react";
import { WonLeadCard } from "@/components/provider/WonLeadCard";

export const Route = createFileRoute("/provider/leads")({
  component: LeadsPage,
  head: () => ({ meta: [{ title: "Leads — Fixido" }] }),
});

const STATUS_OPTIONS = ["unlocked","contacted","quoted","won","lost","customer_no_response","invalid","completed"] as const;

const DISMISS_KEY = "fixido.dismissedLeads.v1";
const readDismissed = (): Set<string> => {
  if (typeof window === "undefined") return new Set();
  try { return new Set(JSON.parse(window.localStorage.getItem(DISMISS_KEY) ?? "[]")); }
  catch { return new Set(); }
};
const writeDismissed = (s: Set<string>) => {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(DISMISS_KEY, JSON.stringify(Array.from(s))); } catch {}
};

function LeadsPage() {
  const { user, roles, loading, rolesReady } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState("available");
  const [available, setAvailable] = useState<LeadPreview[] | null>(null);
  const [unlocked, setUnlocked] = useState<any[] | null>(null);
  const [won, setWon] = useState<any[]>([]);
  const [lost, setLost] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [hasServices, setHasServices] = useState(true);
  const [hasAreas, setHasAreas] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pickedLead, setPickedLead] = useState<LeadPreview | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(() => readDismissed());

  const dismiss = (id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev); next.add(id); writeDismissed(next); return next;
    });
  };

  const refresh = async () => {
    if (!user) return;
    setLoadError(null);

    try {
      const w = await getWallet(user.id);
      setBalance(w?.balance_credits ?? 0);

      const [{ data: svc }, { data: ars }] = await Promise.all([
        supabase.from("provider_services").select("category_slug").eq("provider_id", user.id),
        supabase.from("provider_service_areas").select("city_slug").eq("provider_id", user.id),
      ]);

      setHasServices((svc ?? []).length > 0);
      setHasAreas((ars ?? []).length > 0);

      // One query for all unlocks; partition by status client-side.
      const [a, allUnlocks] = await Promise.all([
        listAvailableLeads(user.id),
        listMyUnlocks(user.id),
      ]);
      const inProgress = new Set(["unlocked","contacted","quoted","completed"]);
      const wonSet = new Set(["won"]);
      const lostSet = new Set(["lost","customer_no_response","invalid"]);
      setAvailable(a);
      setUnlocked(allUnlocks.filter((u: any) => inProgress.has(u.status)));
      setWon(allUnlocks.filter((u: any) => wonSet.has(u.status)));
      setLost(allUnlocks.filter((u: any) => lostSet.has(u.status)));
    } catch (error) {
      console.error("Failed to load leads", error);
      setAvailable([]);
      setUnlocked([]);
      setWon([]);
      setLost([]);
      setLoadError(
        isCustomerLeadRecursionError(error)
          ? "The leads database policies still need the latest recursion fix applied in Supabase."
          : "Could not load leads right now.",
      );
    }
  };

  useEffect(() => {
    if (loading || !rolesReady) return;
    if (!user) return void nav({ to: "/signin", search: { redirect: "/provider/leads" } });
    if (!roles.includes("provider")) return void nav({ to: "/provider/onboarding" });
    refresh();
  }, [loading, rolesReady, user, roles, nav]);

  // Render shell + skeletons immediately. Don't blank the page while auth
  // or initial data is loading — that's the main source of perceived lag.

  const doUnlock = async () => {
    if (!pickedLead) return;
    setUnlocking(true);
    try {
      const res = await unlockLead(pickedLead.id);
      if (!res.ok) {
        toast.error(UNLOCK_ERROR_MESSAGES[res.error ?? ""] ?? res.error ?? "Failed to unlock");
      } else {
        toast.success("Lead unlocked! Customer details revealed.");
        setPickedLead(null);
        refresh();
        setTab("unlocked");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Leads</h1>
          <Link to="/provider/wallet" className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <Wallet className="h-3.5 w-3.5" /> {fmt(balance)} credits
          </Link>
        </div>

        {loadError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <p className="font-medium">Couldn’t load all lead data.</p>
            <p className="mt-1 text-xs text-destructive/80">{loadError}</p>
          </div>
        ) : null}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="available">Available</TabsTrigger>
            <TabsTrigger value="unlocked">Unlocked</TabsTrigger>
            <TabsTrigger value="won">Won</TabsTrigger>
            <TabsTrigger value="lost">Lost</TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="space-y-3">
            {available === null ? <SkelList /> :
              !hasServices || !hasAreas ? (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900">
                  <p className="font-semibold mb-1">Finish your provider profile to receive leads.</p>
                  <p className="text-xs mb-3">
                    {!hasServices && "You haven't selected any service categories. "}
                    {!hasAreas && "You haven't set any service areas. "}
                  </p>
                  <Link to="/provider/onboarding" className="inline-block rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white">Update profile</Link>
                </div>
              ) :
              (() => {
                const visible = available.filter((l) => !dismissed.has(l.id));
                if (visible.length === 0) return <Empty msg="No matching leads in your service areas right now. Check back soon." />;
                return visible.map((l) => (
                  <LockedCard key={l.id} lead={l} onUnlock={() => setPickedLead(l)} onDismiss={() => dismiss(l.id)} />
                ));
              })()}
          </TabsContent>

          <TabsContent value="unlocked" className="space-y-3">
            {unlocked === null ? <SkelList /> :
              unlocked.length === 0 ? <Empty msg="You haven't unlocked any leads yet." /> :
              unlocked.map((u) => <UnlockedCard key={u.id} unlock={u} onChange={refresh} />)}
          </TabsContent>

          <TabsContent value="won" className="space-y-3">
            {won.length === 0 ? <Empty msg="No won jobs yet." /> :
              won.map((u) => <WonLeadCard key={u.id} unlock={u} userId={user!.id} onChange={refresh} />)}
          </TabsContent>

          <TabsContent value="lost" className="space-y-3">
            {lost.length === 0 ? <Empty msg="No lost or invalid leads." /> :
              lost.map((u) => <UnlockedCard key={u.id} unlock={u} onChange={refresh} />)}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!pickedLead} onOpenChange={(o) => !o && setPickedLead(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlock this lead?</DialogTitle>
          </DialogHeader>
          {pickedLead && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-border p-3">
                <div className="font-medium">{pickedLead.service_name_en}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {pickedLead.city_slug} · {pickedLead.urgency}
                </div>
              </div>
              <p>
                Confirm to deduct <strong>{fmt(pickedLead.lead_price_credits)} credits</strong> from your wallet and reveal the customer's full request, contact details and address. This fee is non-refundable once valid details are shown.
              </p>
              <p className="text-xs text-muted-foreground">
                Wallet balance: <strong>{fmt(balance)} credits</strong> → after unlock: <strong>{fmt(Math.max(0, balance - pickedLead.lead_price_credits))} credits</strong>
              </p>
              <p className="text-xs text-muted-foreground">
                {pickedLead.current_unlock_count} of {pickedLead.max_provider_unlocks} providers have unlocked this lead.
              </p>
              {balance < pickedLead.lead_price_credits && (
                <p className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
                  Insufficient credits. You have {fmt(balance)}, need {fmt(pickedLead.lead_price_credits)}.{" "}
                  <Link to="/provider/wallet" className="underline">Top up</Link>
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPickedLead(null)}>Cancel</Button>
            <Button onClick={doUnlock} disabled={unlocking || (pickedLead ? balance < pickedLead.lead_price_credits : true)}>
              {unlocking ? "Unlocking…" : `Unlock for ${fmt(pickedLead?.lead_price_credits ?? 0)} credits`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SkelList() {
  return <div className="space-y-3">{[0,1,2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}</div>;
}
function Empty({ msg }: { msg: string }) {
  return <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">{msg}</p>;
}

function LockedCard({ lead, onUnlock, onDismiss }: { lead: LeadPreview; onUnlock: () => void; onDismiss: () => void }) {
  const slotsLeft = lead.max_provider_unlocks - lead.current_unlock_count;
  return (
    <div className={`rounded-2xl border bg-card p-4 ${lead.is_direct ? "border-primary ring-1 ring-primary/40" : "border-border"}`}>
      {lead.is_direct && (
        <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
          Direct request · for you only
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold">{lead.service_name_en}</div>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{lead.city_slug}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{lead.urgency}</span>
            {lead.photo_count > 0 && <span className="flex items-center gap-1"><ImageIcon className="h-3 w-3" />{lead.photo_count}</span>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-primary">{fmt(lead.lead_price_credits)}</div>
          <div className="text-[10px] text-muted-foreground">credits to view</div>
        </div>
      </div>
      <p className="mt-2 text-sm text-muted-foreground italic">
        Lead details are hidden. View the lead to see the customer's request, contact info and address.
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Received: {new Date(lead.created_at).toLocaleString()}
      </p>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {lead.current_unlock_count} of {lead.max_provider_unlocks} unlocked
          {slotsLeft <= 2 && <span className="ml-1 font-semibold text-amber-600">· {slotsLeft} slot{slotsLeft===1?"":"s"} left</span>}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            title="Hide this lead"
          >
            <XIcon className="h-3 w-3" /> Not interested
          </button>
          <Button size="sm" onClick={onUnlock}><Lock className="mr-1 h-3.5 w-3.5" />View Lead ({fmt(lead.lead_price_credits)} credits)</Button>
        </div>
      </div>
    </div>
  );
}

function UnlockedCard({ unlock, onChange }: { unlock: any; onChange: () => void }) {
  const l = unlock.customer_leads;
  const [status, setStatus] = useState(unlock.status);
  const [price, setPrice] = useState<string>(unlock.quoted_price_mmk?.toString() ?? "");
  const [notes, setNotes] = useState(unlock.provider_notes ?? "");
  const [saving, setSaving] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportKind, setReportKind] = useState<"wrong_info" | "spam_lead" | "fraud" | "other">("wrong_info");
  const [reportBusy, setReportBusy] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteEta, setQuoteEta] = useState("");
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [existingQuote, setExistingQuote] = useState<{ id: string; amount: number } | null>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from("quotes")
      .select("id, amount")
      .eq("lead_id", unlock.lead_id)
      .eq("provider_id", unlock.provider_id)
      .maybeSingle()
      .then(({ data }) => { if (active && data) setExistingQuote(data as any); });
    return () => { active = false; };
  }, [unlock.lead_id, unlock.provider_id]);

  const sendQuote = async () => {
    const amt = price ? parseInt(price, 10) : 0;
    if (!amt || amt <= 0) { toast.error("Enter a valid quote amount first"); return; }
    setQuoteBusy(true);
    const { data, error } = await supabase
      .from("quotes")
      .upsert(
        {
          lead_id: unlock.lead_id,
          provider_id: unlock.provider_id,
          amount: amt,
          eta_text: quoteEta || null,
          notes: notes || null,
          status: "pending",
        },
        { onConflict: "lead_id,provider_id" },
      )
      .select("id, amount")
      .single();
    if (!error) {
      await updateUnlockStatus(unlock.id, {
        status: "quoted",
        quoted_price_mmk: amt,
        provider_notes: notes || null,
      });
    }
    setQuoteBusy(false);
    if (error) { toast.error(error.message); return; }
    setExistingQuote(data as any);
    setStatus("quoted");
    setQuoteOpen(false);
    toast.success("Quote sent to customer");
    onChange();
  };

  useEffect(() => {
    let active = true;
    supabase
      .from("unlock_refund_requests")
      .select("id")
      .eq("unlock_id", unlock.id)
      .maybeSingle()
      .then(({ data }) => { if (active) setReportSent(!!data); });
    return () => { active = false; };
  }, [unlock.id]);

  const submitReport = async () => {
    if (!reportReason.trim()) { toast.error("Add a short reason"); return; }
    setReportBusy(true);
    const { error } = await supabase.from("unlock_refund_requests").insert({
      unlock_id: unlock.id,
      provider_id: unlock.provider_id,
      lead_id: unlock.lead_id,
      reason: `[${reportKind}] ${reportReason.trim()}`,
    });
    setReportBusy(false);
    if (error) return toast.error(error.message);
    setReportSent(true);
    setReportOpen(false);
    toast.success("Report sent. Admin will review.");
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateUnlockStatus(unlock.id, {
        status,
        quoted_price_mmk: price ? parseInt(price, 10) : null,
        provider_notes: notes || null,
      });
      toast.success("Saved");
      onChange();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Unlock className="h-4 w-4 text-green-600" />
            <span className="font-semibold">{l?.customer_name ?? "Customer"}</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {l?.city_slug ?? ""}{l?.urgency ? ` · ${l.urgency}` : ""}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {l?.created_at && <>Lead received: {new Date(l.created_at).toLocaleString()} · </>}
            Unlocked: {new Date(unlock.unlocked_at).toLocaleString()}
          </div>
        </div>
        {l?.customer_phone && (
          <a href={`tel:${l.customer_phone}`} className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
            <Phone className="h-3 w-3" />{l.customer_phone}
          </a>
        )}
      </div>
      {l?.address && <p className="mt-2 text-xs"><strong>Address:</strong> {l.address}</p>}
      {(l?.full_description || l?.short_description) && (
        <p className="mt-2 text-sm">{l.full_description ?? l.short_description}</p>
      )}
      {l?.preferred_date && (
        <p className="mt-1 text-xs text-muted-foreground">
          Preferred: {l.preferred_date}{l.preferred_time ? ` ${l.preferred_time}` : ""}
        </p>
      )}
      {(l?.budget_min || l?.budget_max) && (
        <p className="mt-1 text-xs text-muted-foreground">
          Budget: {l.budget_min ? `${l.budget_min} ` : ""}{l.budget_max ? `- ${l.budget_max}` : ""} MMK
        </p>
      )}
      {!l && (
        <p className="mt-2 rounded-md bg-amber-50 p-2 text-xs text-amber-800">
          Lead details temporarily unavailable. Try refreshing.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {l?.customer_phone && (
          <a href={`tel:${l.customer_phone}`} className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-accent">
            <Phone className="h-3.5 w-3.5" /> Call customer
          </a>
        )}
        <Link
          to="/request/$leadId"
          params={{ leadId: unlock.lead_id }}
          search={{ tab: "messages" }}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-accent"
        >
          <MessageCircle className="h-3.5 w-3.5" /> Message customer
        </Link>
        <Link
          to="/request/$leadId"
          params={{ leadId: unlock.lead_id }}
          search={{ tab: "details" }}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-accent"
        >
          View full request
        </Link>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <select className="rounded-md border border-border bg-background px-2 py-1.5 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g," ")}</option>)}
        </select>
        <Input placeholder="Quoted price (MMK)" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} />
        <Button size="sm" onClick={save} disabled={saving}>{saving?"Saving…":"Save"}</Button>
      </div>
      <Textarea className="mt-2" placeholder="Internal notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="default"
          onClick={() => setQuoteOpen(true)}
          disabled={!price || parseInt(price, 10) <= 0}
        >
          <Send className="mr-1 h-3.5 w-3.5" />
          {existingQuote ? "Update quote to customer" : "Send quote to customer"}
        </Button>
        {existingQuote && (
          <span className="text-[11px] text-muted-foreground">
            Sent: {fmt(existingQuote.amount)} MMK
          </span>
        )}
      </div>
      {unlock.is_refunded && <p className="mt-2 text-xs text-amber-600">Refunded: {fmt(unlock.refunded_amount_credits)} credits</p>}
      <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2">
        {reportSent ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <AlertTriangle className="h-3 w-3" /> Refund request submitted
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 hover:underline"
          >
            <AlertTriangle className="h-3 w-3" /> Report invalid lead / request refund
          </button>
        )}
      </div>
      <Dialog open={reportOpen} onOpenChange={(o) => !o && setReportOpen(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Report this lead</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-xs text-muted-foreground">
              Use this when the lead has wrong contact info, is spam, or fraudulent. Admin will review and refund your credits if approved.
            </p>
            <div>
              <label className="text-xs font-medium">Reason</label>
              <select
                className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm"
                value={reportKind}
                onChange={(e) => setReportKind(e.target.value as typeof reportKind)}
              >
                <option value="wrong_info">Wrong contact info / unreachable</option>
                <option value="spam_lead">Spam or duplicate</option>
                <option value="fraud">Fraudulent</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">Details</label>
              <Textarea rows={3} value={reportReason} onChange={(e) => setReportReason(e.target.value)} placeholder="What happened?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReportOpen(false)} disabled={reportBusy}>Cancel</Button>
            <Button onClick={submitReport} disabled={reportBusy || !reportReason.trim()}>{reportBusy ? "Sending…" : "Submit report"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={quoteOpen} onOpenChange={(o) => !o && setQuoteOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{existingQuote ? "Update quote" : "Send quote to customer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-xs text-muted-foreground">
              The customer will receive a notification with your quote and can accept it to create a booking.
            </p>
            <div>
              <label className="text-xs font-medium">Price (MMK)</label>
              <Input
                className="mt-1"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
                placeholder="e.g. 25000"
              />
            </div>
            <div>
              <label className="text-xs font-medium">When can you do it? (optional)</label>
              <Input
                className="mt-1"
                value={quoteEta}
                onChange={(e) => setQuoteEta(e.target.value)}
                placeholder="e.g. Tomorrow 10am"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Notes for customer (optional)</label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            {price && (
              <p className="rounded-md bg-primary/5 p-2 text-xs">
                Confirm sending <strong>{fmt(parseInt(price, 10))} MMK</strong> quote to {l?.customer_name ?? "the customer"}.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setQuoteOpen(false)} disabled={quoteBusy}>Cancel</Button>
            <Button onClick={sendQuote} disabled={quoteBusy || !price || parseInt(price, 10) <= 0}>
              {quoteBusy ? "Sending…" : existingQuote ? "Update quote" : "Confirm & send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
