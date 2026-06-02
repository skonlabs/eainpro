import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRoleGuard } from "@/lib/use-role-guard";
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
import { useI18n } from "@/lib/i18n";
import { unlockStatusPair, unlockHintPair } from "@/lib/status-i18n";
import { CITIES, TOWNSHIPS } from "@/lib/catalog";
import { whenLabel, windowLabel, urgencyLabel } from "@/lib/display-i18n";

export const Route = createFileRoute("/provider/leads")({
  component: LeadsPage,
  head: () => ({ meta: [{ title: "Leads — Fixido" }] }),
});

const STATUS_OPTIONS = ["unlocked","contacted","quoted","won","lost","customer_no_response","invalid","completed"] as const;
type StatusKey = typeof STATUS_OPTIONS[number];
const STATUS_META: Record<StatusKey, { label: string; hint: string; tone: string }> = {
  unlocked: { label: "New — not contacted yet", hint: "You just unlocked this lead.", tone: "bg-muted text-foreground" },
  contacted: { label: "Contacted customer", hint: "Use after you've called or messaged the customer.", tone: "bg-blue-100 text-blue-800" },
  quoted: { label: "Quote sent", hint: "Set automatically when you send a quote.", tone: "bg-indigo-100 text-indigo-800" },
  won: { label: "Won — customer accepted", hint: "Customer agreed to hire you.", tone: "bg-emerald-100 text-emerald-800" },
  lost: { label: "Lost — chose another provider", hint: "Customer picked someone else or declined.", tone: "bg-rose-100 text-rose-800" },
  customer_no_response: { label: "No response from customer", hint: "You tried to reach them but got no reply.", tone: "bg-amber-100 text-amber-800" },
  invalid: { label: "Invalid lead", hint: "Wrong info, spam, or fraud — also submit a refund report.", tone: "bg-amber-100 text-amber-800" },
  completed: { label: "Job completed", hint: "Work is finished. (Bookings auto-update this too.)", tone: "bg-emerald-100 text-emerald-800" },
};

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

const preferredTimeLabel = (value: string | null | undefined, lang: "en" | "my") => windowLabel(value, lang);

function LeadsPage() {
  const { user, roles, loading, rolesReady } = useAuth();
  const guard = useRoleGuard("provider");
  const nav = useNavigate();
  const { lang } = useI18n();
  const L = (en: string, my: string) => (lang === "en" ? en : my);
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
    if (!guard.allowed) return;
    if (!user) return;
    refresh();
  }, [guard.allowed, user]);

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
        toast.success(L("Lead unlocked! Customer details revealed.", "Lead ဖွင့်ပြီး! ဖောက်သည် အချက်အလက် ပေါ်လာပြီ။"));
        setPickedLead(null);
        refresh();
        setTab("unlocked");
      }
    } catch (e: any) {
      toast.error(e.message ?? L("Failed", "မအောင်မြင်ပါ"));
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6 sm:py-10">
        <h1 className="text-2xl font-bold">{L("Leads", "Lead များ")}</h1>

        {loadError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <p className="font-medium">Couldn’t load all lead data.</p>
            <p className="mt-1 text-xs text-destructive/80">{loadError}</p>
          </div>
        ) : null}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="available">
              {L("Available", "ရရှိနိုင်")}
              {available && available.filter((l) => !dismissed.has(l.id)).length > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {available.filter((l) => !dismissed.has(l.id)).length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="unlocked">
              {L("Unlocked", "ဖွင့်ပြီး")}
              {unlocked && unlocked.length > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold text-foreground">
                  {unlocked.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="won">
              {L("Won", "အနိုင်ရ")}
              {won.length > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
                  {won.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="lost">
              {L("Lost", "ရှုံး")}
              {lost.length > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {lost.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="space-y-3">
            {available === null ? <SkelList /> :
              !hasServices || !hasAreas ? (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900">
                  <p className="font-semibold mb-1">{L("Finish your provider profile to receive leads.", "Lead ရရှိရန် provider ပရိုဖိုင် ပြည့်စုံပါစေ။")}</p>
                  <p className="text-xs mb-3">
                    {!hasServices && L("You haven't selected any service categories. ", "ဝန်ဆောင်မှု အမျိုးအစား မရွေးရသေး။ ")}
                    {!hasAreas && L("You haven't set any service areas. ", "ဝန်ဆောင်ပေးသော နယ်မြေ မသတ်မှတ်ရသေး။ ")}
                  </p>
                  <Link to="/provider/onboarding" className="inline-block rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white">{L("Update profile", "ပရိုဖိုင် အပ်ဒိတ်")}</Link>
                </div>
              ) :
              (() => {
                const visible = available.filter((l) => !dismissed.has(l.id));
                if (visible.length === 0) return <Empty msg={L("No matching leads in your service areas right now. Check back soon.", "သင့် နယ်မြေတွင် Lead မရှိသေး။ နောက်မှ ပြန်စစ်ပါ။")} />;
                return visible.map((l) => (
                  <LockedCard key={l.id} lead={l} onUnlock={() => setPickedLead(l)} onDismiss={() => dismiss(l.id)} />
                ));
              })()}
          </TabsContent>

          <TabsContent value="unlocked" className="space-y-3">
            {unlocked === null ? <SkelList /> :
              unlocked.length === 0 ? <Empty msg={L("You haven't unlocked any leads yet.", "Lead တစ်ခုမှ မဖွင့်ရသေး။")} /> :
              unlocked.map((u) => <UnlockedCard key={u.id} unlock={u} onChange={refresh} />)}
          </TabsContent>

          <TabsContent value="won" className="space-y-3">
            {won.length === 0 ? <Empty msg={L("No won jobs yet.", "အနိုင်ရ အလုပ် မရှိသေး။")} /> :
              won.map((u) => <WonLeadCard key={u.id} unlock={u} userId={user!.id} onChange={refresh} />)}
          </TabsContent>

          <TabsContent value="lost" className="space-y-3">
            {lost.length === 0 ? <Empty msg={L("No lost or invalid leads.", "ရှုံး သို့ မမှန်ကန်သော Lead မရှိ။")} /> :
              lost.map((u) => <UnlockedCard key={u.id} unlock={u} onChange={refresh} />)}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!pickedLead} onOpenChange={(o) => !o && setPickedLead(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{L("Unlock this lead?", "ဤ Lead ဖွင့်မလား?")}</DialogTitle>
          </DialogHeader>
          {pickedLead && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-border p-3">
                <div className="font-medium">{lang === "en" ? pickedLead.service_name_en : pickedLead.service_name_my}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {(CITIES.find((c) => c.slug === pickedLead.city_slug)?.[lang] ?? pickedLead.city_slug)} · {urgencyLabel(pickedLead.urgency, lang)}
                </div>
              </div>
              <p>
{L("Confirm to deduct", "ဖြတ်တောက်ရန် အတည်ပြုပါ")} <strong>{fmt(pickedLead.lead_price_credits)} credits</strong> {L("from your wallet and reveal the customer's full request, contact details and address. This fee is non-refundable once valid details are shown.", "ပိုက်ဆံအိတ်မှ ဖြတ်ပြီး ဖောက်သည်၏ တောင်းဆိုချက်နှင့် ဆက်သွယ်ရေး အသေးစိတ် ဖော်ပြမည်။ အချက်အလက် မှန်ကန်ပါက ငွေပြန်မအပ်ပါ။")}
              </p>
              <p className="text-xs text-muted-foreground">
{L("Wallet balance:", "ပိုက်ဆံအိတ် လက်ကျန်:")} <strong>{fmt(balance)} credits</strong> → {L("after unlock:", "ဖွင့်ပြီးနောက်:")} <strong>{fmt(Math.max(0, balance - pickedLead.lead_price_credits))} credits</strong>
              </p>
              <p className="text-xs text-muted-foreground">
{pickedLead.current_unlock_count} {L("of", "/")} {pickedLead.max_provider_unlocks} {L("providers have unlocked this lead.", "provider Lead ဖွင့်ပြီး။")}
              </p>
              {balance < pickedLead.lead_price_credits && (
                <p className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
                  {L("Insufficient credits. You have", "Credits မလုံ။ သင့်တွင်")} {fmt(balance)}{L(", need", ", လိုသည်")} {fmt(pickedLead.lead_price_credits)}.{" "}
                  <Link to="/provider/wallet" className="underline">{L("Top up", "ဖြည့်ပါ")}</Link>
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPickedLead(null)}>{L("Cancel", "ပယ်ဖျက်")}</Button>
            <Button onClick={doUnlock} disabled={unlocking || (pickedLead ? balance < pickedLead.lead_price_credits : true)}>
              {unlocking ? L("Unlocking…", "ဖွင့်နေ…") : `${L("Unlock for", "ဖွင့်ရန်")} ${fmt(pickedLead?.lead_price_credits ?? 0)} credits`}
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
  const { lang } = useI18n();
  const L = (en: string, my: string) => (lang === "en" ? en : my);
  const slotsLeft = lead.max_provider_unlocks - lead.current_unlock_count;
  return (
    <div className={`rounded-2xl border bg-card p-4 ${lead.is_direct ? "border-primary ring-1 ring-primary/40" : "border-border"}`}>
      {lead.is_direct && (
        <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
          {L("Direct request · for you only", "တိုက်ရိုက် တောင်းဆိုချက် · သင့်အတွက်သာ")}
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold">{lang === "en" ? lead.service_name_en : lead.service_name_my}</div>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{(() => {
              const city = CITIES.find((c) => c.slug === lead.city_slug);
              const cityLabel = city ? (lang === "en" ? city.en : city.my) : lead.city_slug;
              const ts = lead.township_slug ? (TOWNSHIPS[lead.city_slug] ?? []).find((t) => t.slug === lead.township_slug) : null;
              const tsLabel = ts ? (lang === "en" ? ts.en : ts.my) : (lead.township_slug ?? null);
              return [tsLabel, cityLabel].filter(Boolean).join(", ");
            })()}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{lead.preferred_date ? `${lead.preferred_date}${lead.preferred_time && lead.preferred_time !== "any" ? ` · ${preferredTimeLabel(lead.preferred_time, lang)}` : ""}` : urgencyLabel(lead.urgency, lang)}</span>
            {lead.photo_count > 0 && <span className="flex items-center gap-1"><ImageIcon className="h-3 w-3" />{lead.photo_count}</span>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-primary">{fmt(lead.lead_price_credits)}</div>
          <div className="text-[10px] text-muted-foreground">{L("credits to view", "credits ကြည့်ရမည်")}</div>
        </div>
      </div>
      <p className="mt-2 text-sm text-muted-foreground italic">
        {L("Lead details are hidden. View the lead to see the customer's request, contact info and address.", "Lead အသေးစိတ် ဖုံးကွယ်ထား။ ဖောက်သည်၏ တောင်းဆိုချက်နှင့် ဆက်သွယ်ရေးကို ကြည့်ရန် ဖွင့်ပါ။")}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {L("Received:", "ရရှိ:")} {new Date(lead.created_at).toLocaleString()}
      </p>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {lead.current_unlock_count} {L("of", "/")} {lead.max_provider_unlocks} {L("unlocked", "ဖွင့်ပြီး")}
          {slotsLeft <= 2 && <span className="ml-1 font-semibold text-amber-600">· {slotsLeft} {L(`slot${slotsLeft===1?"":"s"} left`, "နေရာ ကျန်")}</span>}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            title={L("Hide this lead", "ဤ Lead ဖုံး")}
          >
            <XIcon className="h-3 w-3" /> {L("Not interested", "မစိတ်ဝင်စား")}
          </button>
          <Button size="sm" onClick={onUnlock}><Lock className="mr-1 h-3.5 w-3.5" />{L("View Lead", "Lead ကြည့်")} ({fmt(lead.lead_price_credits)} credits)</Button>
        </div>
      </div>
    </div>
  );
}

function UnlockedCard({ unlock, onChange }: { unlock: any; onChange: () => void }) {
  const { lang } = useI18n();
  const L = (en: string, my: string) => (lang === "en" ? en : my);
  const tStatus = (s: string) => (lang === "en" ? unlockStatusPair(s).en : unlockStatusPair(s).my);
  const tHint = (s: string) => (lang === "en" ? unlockHintPair(s).en : unlockHintPair(s).my);
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
  const [existingQuote, setExistingQuote] = useState<{ id: string; amount: number; created_at: string; eta_text: string | null; notes: string | null } | null>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from("quotes")
      .select("id, amount, created_at, eta_text, notes")
      .eq("lead_id", unlock.lead_id)
      .eq("provider_id", unlock.provider_id)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data) {
          setExistingQuote(data as any);
          setQuoteEta((data as any).eta_text ?? "");
          if ((data as any).notes) setNotes((data as any).notes);
          if ((data as any).amount) setPrice(String((data as any).amount));
        }
      });
    return () => { active = false; };
  }, [unlock.lead_id, unlock.provider_id]);

  const sendQuote = async () => {
    const amt = price ? parseInt(price, 10) : 0;
    if (!amt || amt <= 0) { toast.error(L("Enter a valid quote amount first", "Quote ပမာဏ ထည့်ပါ")); return; }
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
      .select("id, amount, created_at, eta_text, notes")
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
    toast.success(L("Quote sent to customer", "Quote ဖောက်သည်ထံ ပို့ပြီး"));
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
    if (!reportReason.trim()) { toast.error(L("Add a short reason", "အကြောင်းပြချက် ထည့်ပါ")); return; }
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
    toast.success(L("Report sent. Admin will review.", "တိုင်ကြားချက် ပို့ပြီး။ Admin စစ်ဆေးမည်။"));
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateUnlockStatus(unlock.id, {
        status,
        quoted_price_mmk: price ? parseInt(price, 10) : null,
        provider_notes: notes || null,
      });
      toast.success(L("Saved", "သိမ်းပြီး"));
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
            {l?.customer_id ? (
              <Link
                to="/c/$customerId"
                params={{ customerId: l.customer_id }}
                className="font-semibold text-primary underline-offset-2 hover:underline"
              >
                {l?.customer_name ?? L("Customer", "ဖောက်သည်")}
              </Link>
            ) : (
              <span className="font-semibold">{l?.customer_name ?? L("Customer", "ဖောက်သည်")}</span>
            )}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {(l?.city_slug ? (CITIES.find((c) => c.slug === l.city_slug)?.[lang] ?? l.city_slug) : "")}{l?.urgency ? ` · ${urgencyLabel(l.urgency, lang)}` : ""}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {l?.created_at && <>{L("Lead received:", "Lead ရရှိ:")} {new Date(l.created_at).toLocaleString()} · </>}
            {L("Unlocked:", "ဖွင့်ပြီး:")} {new Date(unlock.unlocked_at).toLocaleString()}
          </div>
        </div>
        {l?.customer_phone && (
          <a href={`tel:${l.customer_phone}`} className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
            <Phone className="h-3 w-3" />{l.customer_phone}
          </a>
        )}
      </div>
      {(l?.address || l?.township_slug || l?.city_slug) && (() => {
        const city = CITIES.find((c) => c.slug === l.city_slug);
        const cityLabel = city ? (lang === "en" ? city.en : city.my) : l.city_slug;
        const ts = l.township_slug
          ? TOWNSHIPS[l.city_slug]?.find((t) => t.slug === l.township_slug)
          : null;
        const tsLabel = ts ? (lang === "en" ? ts.en : ts.my) : l.township_slug ?? null;
        const parts = [l.address, tsLabel, cityLabel].filter(Boolean);
        return <p className="mt-2 text-xs"><strong>{L("Address:", "လိပ်စာ:")}</strong> {parts.join(", ")}</p>;
      })()}
      {(l?.full_description || l?.short_description) && (
        <p className="mt-2 text-sm">{l.full_description ?? l.short_description}</p>
      )}
      {l?.preferred_date && (
        <p className="mt-1 text-xs text-muted-foreground">
          {L("Preferred:", "ဦးစားပေး:")} {l.preferred_date}{l.preferred_time ? ` ${preferredTimeLabel(l.preferred_time, lang)}` : ""}
        </p>
      )}
      {(l?.budget_min || l?.budget_max) && (
        <p className="mt-1 text-xs text-muted-foreground">
          {L("Budget:", "ဘတ်ဂျက်:")} {l.budget_min ? `${l.budget_min} ` : ""}{l.budget_max ? `- ${l.budget_max}` : ""} MMK
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
            <Phone className="h-3.5 w-3.5" /> {L("Call customer", "ဖောက်သည် ဆက်သွယ်")}
          </a>
        )}
        <Link
          to="/request/$leadId"
          params={{ leadId: unlock.lead_id }}
          search={{ tab: "messages" }}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-accent"
        >
          <MessageCircle className="h-3.5 w-3.5" /> {L("Message customer", "ဖောက်သည် မက်ဆေ့")}
        </Link>
        <Link
          to="/request/$leadId"
          params={{ leadId: unlock.lead_id }}
          search={{ tab: "details" }}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-accent"
        >
          {L("View full request", "တောင်းဆိုချက် အပြည့်")}
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="default"
          onClick={() => setQuoteOpen(true)}
        >
          <Send className="mr-1 h-3.5 w-3.5" />
          {existingQuote ? L("Update quote to customer", "Quote အပ်ဒိတ်") : L("Send quote to customer", "Quote ပို့ပါ")}
        </Button>
        {existingQuote && (
          <span className="text-[11px] text-muted-foreground">
            {L("Sent:", "ပို့ပြီး:")} {fmt(existingQuote.amount)} MMK · {new Date(existingQuote.created_at).toLocaleString()}
          </span>
        )}
      </div>

      <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold">{L("Job progress", "အလုပ် တိုးတက်မှု")}</div>
            <div className="text-[11px] text-muted-foreground">{L("Track this lead so you remember where it stands. Only you see this.", "ဤ Lead ၏ အခြေအနေကို မှတ်သားပါ။ သင်သာ မြင်သည်။")}</div>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_META[unlock.status as StatusKey]?.tone ?? "bg-muted text-foreground"}`}>
            {tStatus(unlock.status)}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="text-[11px] font-medium text-muted-foreground">{lang === "en" ? "Change to:" : "ပြောင်းရန်:"}</label>
          <select
            className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{tStatus(s)}</option>)}
          </select>
          {status !== unlock.status && (
            <Button
              size="sm"
              onClick={async () => {
                if (!confirm(L(`Update job progress to "${tStatus(status)}"?`, `အလုပ်တိုးတက်မှုကို "${tStatus(status)}" သို့ ပြောင်းမလား?`))) return;
                await save();
              }}
              disabled={saving}
            >
              {saving ? L("Saving…", "သိမ်းနေ…") : L("Confirm change", "ပြောင်းလဲမည်")}
            </Button>
          )}
        </div>
        {status !== unlock.status && (
          <p className="mt-2 text-[11px] text-muted-foreground">{tHint(status)}</p>
        )}
      </div>
      {unlock.is_refunded && <p className="mt-2 text-xs text-amber-600">Refunded: {fmt(unlock.refunded_amount_credits)} credits</p>}
      <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2">
        {reportSent ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <AlertTriangle className="h-3 w-3" /> {L("Refund request submitted", "ငွေပြန်အမ်းရန် တောင်းဆိုပြီး")}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 hover:underline"
          >
            <AlertTriangle className="h-3 w-3" /> {L("Report invalid lead / request refund", "မမှန်ကန်သော Lead တိုင်ကြား / ငွေပြန်တောင်း")}
          </button>
        )}
      </div>
      <Dialog open={reportOpen} onOpenChange={(o) => !o && setReportOpen(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Report this lead</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-xs text-muted-foreground">
              {L("Use this when the lead has wrong contact info, is spam, or fraudulent. Admin will review and refund your credits if approved.", "ဆက်သွယ်ရေး မမှန်ကန်သော Lead ဖြစ်ပါက တိုင်ကြားပါ။ Admin စစ်ဆေးပြီး credits ပြန်အမ်းနိုင်သည်။")}
            </p>
            <div>
              <label className="text-xs font-medium">{L("Reason", "အကြောင်းရင်း")}</label>
              <select
                className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm"
                value={reportKind}
                onChange={(e) => setReportKind(e.target.value as typeof reportKind)}
              >
                <option value="wrong_info">{L("Wrong contact info / unreachable", "ဆက်သွယ်ရေး မမှန်")}</option>
                <option value="spam_lead">{L("Spam or duplicate", "Spam သို့ ထပ်တူ")}</option>
                <option value="fraud">{L("Fraudulent", "လိမ်ညာမှု")}</option>
                <option value="other">{L("Other", "အခြား")}</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">{L("Details", "အသေးစိတ်")}</label>
              <Textarea rows={3} value={reportReason} onChange={(e) => setReportReason(e.target.value)} placeholder={L("What happened?", "ဘာဖြစ်သွားသနည်း?")} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReportOpen(false)} disabled={reportBusy}>{L("Cancel", "ပယ်ဖျက်")}</Button>
            <Button onClick={submitReport} disabled={reportBusy || !reportReason.trim()}>{reportBusy ? L("Sending…", "ပို့နေ…") : L("Submit report", "တိုင်ကြားမည်")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={quoteOpen} onOpenChange={(o) => !o && setQuoteOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{existingQuote ? L("Update quote", "Quote အပ်ဒိတ်") : L("Send quote to customer", "Quote ဖောက်သည်ထံ ပို့ပါ")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-xs text-muted-foreground">
              {L("The customer will receive a notification with your quote and can accept it to create a booking.", "ဖောက်သည်သည် သင်၏ quote အကြောင်း သတိပေးချက် ရမည်ဖြစ်ပြီး လက်ခံလျှင် ဘုတ်ကင် ဖန်တီးနိုင်သည်။")}
            </p>
            <div>
              <label className="text-xs font-medium">{L("Price (MMK)", "စျေး (ကျပ်)")}</label>
              <Input
                className="mt-1"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
                placeholder="e.g. 25000"
              />
            </div>
            <div>
              <label className="text-xs font-medium">{L("When can you do it? (optional)", "ဘယ်အချိန် လုပ်နိုင်သည်? (ရွေး)")}</label>
              <Input
                className="mt-1"
                value={quoteEta}
                onChange={(e) => setQuoteEta(e.target.value)}
                placeholder={L("e.g. Tomorrow 10am", "ဥပမာ မနက်ဖြန် ၁၀ နာရီ")}
              />
            </div>
            <div>
              <label className="text-xs font-medium">{L("Notes for customer (optional)", "ဖောက်သည်အတွက် မှတ်ချက် (ရွေး)")}</label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            {price && (
              <p className="rounded-md bg-primary/5 p-2 text-xs">
                {L("Confirm sending", "ပို့မည်ဟု အတည်ပြုပါ")} <strong>{fmt(parseInt(price, 10))} MMK</strong> {L("quote to", "quote ကို")} {l?.customer_name ?? L("the customer", "ဖောက်သည်")}.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setQuoteOpen(false)} disabled={quoteBusy}>{L("Cancel", "ပယ်ဖျက်")}</Button>
            <Button onClick={sendQuote} disabled={quoteBusy || !price || parseInt(price, 10) <= 0}>
              {quoteBusy ? L("Sending…", "ပို့နေ…") : existingQuote ? L("Update quote", "Quote အပ်ဒိတ်") : L("Confirm & send", "အတည်ပြုပြီး ပို့")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
