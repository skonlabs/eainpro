import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Clock, Phone, Send, CheckCircle2, Star, Lock, XCircle, AlertTriangle } from "lucide-react";

const search = z.object({ tab: z.string().optional() });

export const Route = createFileRoute("/request/$leadId")({
  validateSearch: search,
  component: LeadPage,
  head: () => ({ meta: [{ title: "Request — Fixido" }] }),
});

type Lead = {
  id: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  city_slug: string;
  address: string | null;
  service_type_id: string;
  urgency: string;
  preferred_date: string | null;
  preferred_time: string | null;
  short_description: string;
  full_description: string | null;
  status: string;
  created_at: string;
  budget_min: number | null;
  budget_max: number | null;
};

type Quote = {
  id: string;
  lead_id: string;
  provider_id: string;
  amount: number;
  notes: string | null;
  eta_text: string | null;
  status: string;
  created_at: string;
  provider?: { business_name: string | null; rating_avg: number | null } | null;
};

type Booking = {
  id: string;
  lead_id: string;
  quote_id: string | null;
  provider_id: string;
  customer_id: string;
  amount: number | null;
  scheduled_at: string | null;
  status: string;
  time_confirmed_by_customer?: boolean | null;
  time_confirmed_by_provider?: boolean | null;
};

type Msg = {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  body: string;
  created_at: string;
};

function LeadPage() {
  const { leadId } = Route.useParams();
  const sp = Route.useSearch();
  const { user, roles, loading: authLoading } = useAuth();
  const { lang } = useI18n();
  const nav = useNavigate();
  const L = (en: string, my: string) => (lang === "en" ? en : my);

  const [lead, setLead] = useState<Lead | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [serviceName, setServiceName] = useState<{ en: string; my: string } | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(sp.tab ?? "details");
  const [providerHasUnlock, setProviderHasUnlock] = useState(false);

  // Keep the active tab in sync with the URL search param so deep links like
  // /request/$id?tab=messages work even when the user is already on the page.
  useEffect(() => {
    if (sp.tab && sp.tab !== tab) setTab(sp.tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.tab]);

  const isProvider = roles.includes("provider");
  const isCustomer = !!user && lead?.customer_id === user.id;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      nav({ to: "/signin", search: { redirect: `/request/${leadId}` } });
      return;
    }
    (async () => {
      // Fetch full lead via security-definer RPC (handles authz)
      const { data: rpcLead, error: rErr } = await supabase.rpc("get_customer_lead", {
        _lead_id: leadId,
      });
      if (rErr) { setError(rErr.message); return; }
      if (!rpcLead) {
        setError(L("Lead not found or not accessible.", "မရှိ သို့မဟုတ် ဝင်ခွင့်မရှိ။"));
        return;
      }
      setLead(rpcLead as Lead);

      const [{ data: ph }, { data: qs }, { data: bk }, { data: msgs }, unlockRes] = await Promise.all([
        supabase.from("lead_photos").select("url").eq("lead_id", leadId).order("sort_order"),
        supabase
          .from("quotes")
          .select("*, provider:providers(business_name, rating_avg)")
          .eq("lead_id", leadId)
          .order("created_at", { ascending: false }),
        supabase.from("bookings").select("*").eq("lead_id", leadId).maybeSingle(),
        supabase
          .from("messages")
          .select("id, sender_id, recipient_id, body, created_at")
          .eq("lead_id", leadId)
          .order("created_at"),
        isProvider
          ? supabase
              .from("provider_lead_unlocks")
              .select("id")
              .eq("lead_id", leadId)
              .eq("provider_id", user.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      setPhotos((ph ?? []).map((r) => r.url));
      setQuotes((qs ?? []) as Quote[]);
      setBooking((bk as Booking) ?? null);
      setMessages((msgs ?? []) as Msg[]);
      setProviderHasUnlock(!!unlockRes.data);
      const stId = (rpcLead as Lead).service_type_id;
      if (stId) {
        const { data: st } = await supabase
          .from("service_types")
          .select("name_en, name_my")
          .eq("id", stId)
          .maybeSingle();
        if (st) setServiceName({ en: st.name_en, my: st.name_my });
      }
    })();
  }, [authLoading, user, leadId, nav, isProvider]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`lead:${leadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `lead_id=eq.${leadId}` },
        (p) => setMessages((prev) => [...prev, p.new as Msg]),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quotes", filter: `lead_id=eq.${leadId}` },
        async () => {
          const { data } = await supabase
            .from("quotes")
            .select("*, provider:providers(business_name, rating_avg)")
            .eq("lead_id", leadId)
            .order("created_at", { ascending: false });
          setQuotes((data ?? []) as Quote[]);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `lead_id=eq.${leadId}` },
        async () => {
          const { data } = await supabase
            .from("bookings")
            .select("*")
            .eq("lead_id", leadId)
            .maybeSingle();
          setBooking((data as Booking) ?? null);
        },
      )
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [user, leadId]);

  if (authLoading || !user) return null;
  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-sm text-destructive">{error}</p>
        <Link to="/" className="mt-3 inline-block text-sm font-semibold text-primary">{L("Back home", "ပင်မ")}</Link>
      </div>
    );
  }
  if (!lead) {
    return <div className="mx-auto max-w-2xl px-4 py-10 text-sm text-muted-foreground">{L("Loading…", "ခဏစောင့်…")}</div>;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => nav({ to: isProvider ? "/provider/leads" : "/my-requests" })} className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{lead.short_description}</div>
            <div className="text-[11px] text-muted-foreground">
              {lead.city_slug} · {lead.urgency} · {new Date(lead.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-4 sm:px-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">{L("Details", "အသေးစိတ်")}</TabsTrigger>
            <TabsTrigger value="quotes">{L("Quotes", "စျေး")} ({quotes.length})</TabsTrigger>
            <TabsTrigger value="booking">{L("Booking", "ဘုတ်ကင်")}</TabsTrigger>
            <TabsTrigger value="messages">{L("Chat", "စကား")}</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-3">
            <DetailsCard
              lead={lead}
              photos={photos}
              serviceName={serviceName}
              isProvider={isProvider}
              isCustomer={isCustomer}
              hasUnlock={providerHasUnlock}
              canEdit={isCustomer && !booking && lead.status !== "cancelled" && lead.status !== "completed"}
              onUpdated={(patch) => setLead((prev) => (prev ? { ...prev, ...patch } : prev))}
              L={L}
            />
            {isCustomer && !booking && lead.status !== "cancelled" && lead.status !== "completed" && (
              <CustomerCancelCard
                leadId={lead.id}
                L={L}
                onCancelled={() => {
                  setLead((prev) => (prev ? { ...prev, status: "cancelled" } : prev));
                  toast.success(L("Request cancelled", "တောင်းဆို ပယ်ဖျက်ပြီး"));
                }}
              />
            )}
            {lead.status === "cancelled" && (
              <div className="rounded-xl border border-border bg-muted/40 p-3 text-center text-xs text-muted-foreground">
                {L("This request has been cancelled.", "ဤတောင်းဆိုမှု ပယ်ဖျက်ပြီးပါပြီ။")}
              </div>
            )}
          </TabsContent>

          <TabsContent value="quotes" className="space-y-3">
            {isProvider && providerHasUnlock && !booking && (
              <ProviderQuoteForm
                leadId={lead.id}
                providerId={user.id}
                existing={quotes.find((q) => q.provider_id === user.id) ?? null}
                L={L}
                onSaved={async () => {
                  const { data } = await supabase
                    .from("quotes")
                    .select("*, provider:providers(business_name, rating_avg)")
                    .eq("lead_id", leadId)
                    .order("created_at", { ascending: false });
                  setQuotes((data ?? []) as Quote[]);
                  toast.success(L("Quote sent", "စျေး ပေးပြီး"));
                }}
              />
            )}
            {isProvider && !providerHasUnlock && (
              <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm">
                <Lock className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                <p>{L("Unlock this lead to send a quote.", "စျေးပေးရန် Lead ကို ဖွင့်ပါ။")}</p>
                <Link to="/provider/leads" className="mt-2 inline-block text-sm font-semibold text-primary">{L("Go to leads", "Lead များ")}</Link>
              </div>
            )}

            {quotes.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {L("No quotes yet.", "စျေး မပေးသေး။")}
              </p>
            ) : (
              <ul className="space-y-2">
                {quotes.map((q) => (
                  <QuoteCard
                    key={q.id}
                    quote={q}
                    isCustomer={isCustomer}
                    isMine={q.provider_id === user.id}
                    booking={booking}
                    L={L}
                    onAccept={async () => {
                      const { data, error } = await supabase.rpc("accept_quote", { p_quote_id: q.id });
                      if (error) { toast.error(error.message); return; }
                      setBooking((data as Booking) ?? null);
                      setTab("booking");
                      toast.success(L("Booked!", "ဘုတ်ကင်ပြီး!"));
                    }}
                  />
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="booking" className="space-y-3">
            <BookingPanel
              lead={lead}
              booking={booking}
              isCustomer={isCustomer}
              isProvider={isProvider}
              userId={user.id}
              L={L}
              onChange={async () => {
                const { data } = await supabase.from("bookings").select("*").eq("lead_id", lead.id).maybeSingle();
                setBooking((data as Booking) ?? null);
              }}
            />
          </TabsContent>

          <TabsContent value="messages" className="space-y-3">
            <ChatPanel
              leadId={lead.id}
              userId={user.id}
              messages={messages}
              peerId={
                isCustomer
                  ? (booking?.provider_id ?? quotes[0]?.provider_id ?? null)
                  : (lead.customer_id ?? null)
              }
              canSend={isCustomer || providerHasUnlock}
              L={L}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function DetailsCard({
  lead,
  photos,
  serviceName,
  isProvider,
  hasUnlock,
  isCustomer,
  canEdit,
  onUpdated,
  L,
}: {
  lead: Lead;
  photos: string[];
  serviceName: { en: string; my: string } | null;
  isProvider: boolean;
  hasUnlock: boolean;
  isCustomer: boolean;
  canEdit: boolean;
  onUpdated: (patch: Partial<Lead>) => void;
  L: (en: string, my: string) => string;
}) {
  const showContact = !isProvider || hasUnlock;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(lead.full_description ?? lead.short_description);
  const [urgency, setUrgency] = useState(lead.urgency);
  const [preferredDate, setPreferredDate] = useState(lead.preferred_date ?? "");
  const [preferredTime, setPreferredTime] = useState(lead.preferred_time ?? "");
  const [address, setAddress] = useState(lead.address ?? "");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    const text = draft.trim();
    if (!text) return;
    setSaving(true);
    const { error } = await supabase
      .from("customer_leads")
      .update({
        full_description: text,
        urgency,
        preferred_date: preferredDate || null,
        preferred_time: preferredTime || null,
        address: address.trim() || null,
      })
      .eq("id", lead.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    onUpdated({
      full_description: text,
      urgency,
      preferred_date: preferredDate || null,
      preferred_time: preferredTime || null,
      address: address.trim() || null,
    });
    setEditing(false);
    toast.success(L("Updated", "ပြင်ပြီး"));
  };
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">{L("Service", "ဝန်ဆောင်မှု")}</div>
          <div>{serviceName ? L(serviceName.en, serviceName.my) : "—"}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">{L("Status", "အခြေအနေ")}</div>
          <div className="capitalize">{lead.status.replace(/_/g, " ")}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">{L("Posted", "တင်ခဲ့")}</div>
          <div>{new Date(lead.created_at).toLocaleString()}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">{L("Budget", "ဘတ်ဂျက်")}</div>
          <div>
            {lead.budget_min || lead.budget_max
              ? `${lead.budget_min ? lead.budget_min.toLocaleString() : "—"} – ${lead.budget_max ? lead.budget_max.toLocaleString() : "—"} MMK`
              : "—"}
          </div>
        </div>
      </div>
      {lead.short_description && lead.full_description && lead.short_description !== lead.full_description && (
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">{L("Summary", "အကျဉ်း")}</div>
          <p className="mt-1 text-sm">{lead.short_description}</p>
        </div>
      )}
      <div>
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase text-muted-foreground">{L("Description", "ဖော်ပြ")}</div>
          {canEdit && !editing && (
            <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium text-primary hover:underline">
              {L("Edit", "ပြင်")}
            </button>
          )}
        </div>
        {editing ? (
          <div className="mt-1 space-y-2">
            <textarea
              className="w-full rounded-md border border-border bg-background p-2 text-sm"
              rows={4}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={saving}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[10px] font-semibold uppercase text-muted-foreground">{L("Urgency", "အရေးပေါ်")}</div>
                <select
                  className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm"
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  disabled={saving}
                >
                  <option value="now">now</option>
                  <option value="today">today</option>
                  <option value="this_week">this_week</option>
                  <option value="flexible">flexible</option>
                </select>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase text-muted-foreground">{L("Preferred date", "ရက်")}</div>
                <Input type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} disabled={saving} />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase text-muted-foreground">{L("Preferred time", "အချိန်")}</div>
                <Input type="time" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} disabled={saving} />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase text-muted-foreground">{L("Address", "လိပ်စာ")}</div>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={L("Street, ward…", "လမ်း, ရပ်ကွက်…")} disabled={saving} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => {
                setDraft(lead.full_description ?? lead.short_description);
                setUrgency(lead.urgency);
                setPreferredDate(lead.preferred_date ?? "");
                setPreferredTime(lead.preferred_time ?? "");
                setAddress(lead.address ?? "");
                setEditing(false);
              }} disabled={saving}>
                {L("Cancel", "ပယ်ဖျက်")}
              </Button>
              <Button size="sm" onClick={save} disabled={saving || !draft.trim()}>
                {saving ? L("Saving…", "သိမ်းနေသည်…") : L("Save", "သိမ်း")}
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm whitespace-pre-wrap">{lead.full_description ?? lead.short_description}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">{L("Urgency", "အရေးပေါ်")}</div>
          <div>{lead.urgency}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">{L("Preferred", "နှစ်သက်ရာ")}</div>
          <div>{lead.preferred_date ?? "—"} {lead.preferred_time ? `· ${lead.preferred_time}` : ""}</div>
        </div>
      </div>
      <div>
        <div className="text-xs font-semibold uppercase text-muted-foreground">{L("Location", "နေရာ")}</div>
        <div className="mt-1 flex items-center gap-1 text-sm">
          <MapPin className="h-3.5 w-3.5" />
          {lead.city_slug}{showContact && lead.address ? ` · ${lead.address}` : ""}
        </div>
      </div>
      {showContact && (
        <div className="rounded-lg border border-border bg-background p-3 text-sm">
          <div className="font-semibold">{lead.customer_name}</div>
          {lead.customer_phone && (
            <a href={`tel:${lead.customer_phone}`} className="mt-1 inline-flex items-center gap-1 text-primary">
              <Phone className="h-3.5 w-3.5" />
              {lead.customer_phone}
            </a>
          )}
        </div>
      )}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((u) => (
            <a key={u} href={u} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded-lg border border-border">
              <img src={u} alt="" className="h-full w-full object-cover" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function ProviderQuoteForm({
  leadId,
  providerId,
  existing,
  onSaved,
  L,
}: {
  leadId: string;
  providerId: string;
  existing: Quote | null;
  onSaved: () => void;
  L: (en: string, my: string) => string;
}) {
  const [amount, setAmount] = useState(existing?.amount.toString() ?? "");
  const [eta, setEta] = useState(existing?.eta_text ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error(L("Enter a valid amount", "ပမာဏ ဖြည့်ပါ"));
    setBusy(true);
    const { error } = await supabase.from("quotes").upsert(
      {
        lead_id: leadId,
        provider_id: providerId,
        amount: amt,
        eta_text: eta || null,
        notes: notes || null,
        status: "pending",
      },
      { onConflict: "lead_id,provider_id" },
    );
    setBusy(false);
    if (error) return toast.error(error.message);
    onSaved();
  };

  return (
    <div className="space-y-2 rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <div className="font-semibold">{existing ? L("Update your quote", "စျေး ပြင်") : L("Send a quote", "စျေး ပေး")}</div>
      <Input placeholder={L("Price (MMK)", "စျေး (MMK)")} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
      <Input placeholder={L("When you can do it (e.g. Tomorrow 10am)", "လုပ်နိုင်တဲ့ အချိန်")} value={eta} onChange={(e) => setEta(e.target.value)} />
      <Textarea placeholder={L("Notes (optional)", "မှတ်ချက်")} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      <Button onClick={submit} disabled={busy} className="w-full">{busy ? L("Saving…", "သိမ်းနေ…") : (existing ? L("Update quote", "ပြင်") : L("Send quote", "ပေး"))}</Button>
    </div>
  );
}

function QuoteCard({
  quote,
  isCustomer,
  isMine,
  booking,
  L,
  onAccept,
}: {
  quote: Quote;
  isCustomer: boolean;
  isMine: boolean;
  booking: Booking | null;
  L: (en: string, my: string) => string;
  onAccept: () => void;
}) {
  const accepted = booking?.quote_id === quote.id || quote.status === "accepted";
  const withdrawn = quote.status === "withdrawn";
  const [busy, setBusy] = useState(false);
  const withdraw = async () => {
    if (!confirm("Withdraw this quote?")) return;
    setBusy(true);
    const { error } = await supabase.from("quotes").update({ status: "withdrawn" }).eq("id", quote.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(L("Quote withdrawn", "ပယ်ဖျက်ပြီး"));
  };
  return (
    <li className={`rounded-xl border p-3 ${accepted ? "border-emerald-500/50 bg-emerald-500/5" : withdrawn ? "border-border bg-muted/30 opacity-60" : "border-border bg-card"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{quote.provider?.business_name ?? L("Provider", "ပညာရှင်")}</span>
            {quote.provider?.rating_avg != null && (
              <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                <Star className="h-3 w-3 fill-current" />
                {Number(quote.provider.rating_avg).toFixed(1)}
              </span>
            )}
            {isMine && <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{L("Mine", "ကိုယ်")}</span>}
          </div>
          {quote.eta_text && <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{quote.eta_text}</div>}
          {quote.notes && <p className="mt-1 text-sm text-muted-foreground">{quote.notes}</p>}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-lg font-bold">{Number(quote.amount).toLocaleString()} MMK</div>
          {accepted && <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle2 className="h-3 w-3" />{L("Accepted", "လက်ခံပြီး")}</span>}
        </div>
      </div>
      {isCustomer && !booking && !accepted && (
        <Button size="sm" className="mt-2 w-full" onClick={onAccept} disabled={withdrawn}>{L("Accept this quote", "လက်ခံ")}</Button>
      )}
      {isMine && !booking && !accepted && !withdrawn && (
        <Button size="sm" variant="outline" className="mt-2 w-full" onClick={withdraw} disabled={busy}>
          {L("Withdraw quote", "ပယ်ဖျက်")}
        </Button>
      )}
      {withdrawn && (
        <p className="mt-2 text-xs text-muted-foreground">{L("Withdrawn", "ပယ်ဖျက်ပြီး")}</p>
      )}
    </li>
  );
}

const NEXT_STATUS: Record<string, { key: string; en: string; my: string }> = {
  accepted: { key: "on_the_way", en: "On the way", my: "လမ်းပေါ်" },
  on_the_way: { key: "started", en: "Start work", my: "စတင်" },
  started: { key: "completed", en: "Complete", my: "ပြီး" },
  in_progress: { key: "completed", en: "Complete", my: "ပြီး" },
};

function BookingPanel({
  lead,
  booking,
  isCustomer,
  isProvider,
  userId,
  L,
  onChange,
}: {
  lead: Lead;
  booking: Booking | null;
  isCustomer: boolean;
  isProvider: boolean;
  userId: string;
  L: (en: string, my: string) => string;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [hasMyReview, setHasMyReview] = useState<boolean | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportKind, setReportKind] = useState<"no_show" | "bad_quality" | "rude" | "fraud" | "other">("bad_quality");
  const [reportText, setReportText] = useState("");
  const [reported, setReported] = useState(false);

  const myRole: "customer" | "provider" | null = isCustomer ? "customer" : (isProvider && booking?.provider_id === userId ? "provider" : null);

  useEffect(() => {
    if (!booking || booking.status !== "completed" || !myRole) return;
    supabase
      .from("reviews")
      .select("id")
      .eq("booking_id", booking.id)
      .eq("rated_by", myRole)
      .maybeSingle()
      .then(({ data }) => setHasMyReview(!!data));
    // also load existing report flag
    supabase
      .from("reports")
      .select("id")
      .eq("booking_id", booking.id)
      .eq("reporter_id", userId)
      .maybeSingle()
      .then(({ data }) => setReported(!!data));
  }, [booking?.id, booking?.status, myRole, userId]);

  if (!booking) {
    return (
      <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        {L("No booking yet. Accept a quote to create one.", "စျေး လက်ခံပါ။")}
      </p>
    );
  }

  const isMyBooking = booking.provider_id === userId || booking.customer_id === userId;
  const next = NEXT_STATUS[booking.status];
  const canAdvance = isProvider && booking.provider_id === userId && next;

  const advance = async () => {
    if (!next) return;
    setBusy(true);
    const patch: Record<string, unknown> = { status: next.key };
    if (next.key === "completed") patch.provider_confirmed_at = new Date().toISOString();
    const { error } = await supabase.from("bookings").update(patch).eq("id", booking.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    if (next.key === "completed") {
      await supabase.from("customer_leads").update({ status: "completed" }).eq("id", lead.id);
    }
    onChange();
    toast.success(L("Updated", "ပြောင်းပြီး"));
  };

  const cancel = async () => {
    setBusy(true);
    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
    setBusy(false);
    onChange();
  };

  const submitReview = async () => {
    if (!myRole) return;
    setBusy(true);
    const { error } = await supabase.from("reviews").insert({
      booking_id: booking.id,
      customer_id: booking.customer_id,
      provider_id: booking.provider_id,
      rating,
      comment: comment || null,
      rated_by: myRole,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setHasMyReview(true);
    toast.success(L("Thanks for the review!", "ကျေးဇူးတင်ပါသည်!"));
  };

  const submitReport = async () => {
    if (!reportText.trim()) { toast.error(L("Tell us what happened", "ဖြစ်ပျက်ပုံ ပြောပါ")); return; }
    setBusy(true);
    const targetId = myRole === "customer" ? booking.provider_id : booking.customer_id;
    const { error } = await supabase.from("reports").insert({
      reporter_id: userId,
      target_user_id: targetId,
      booking_id: booking.id,
      lead_id: lead.id,
      kind: reportKind,
      reason: reportText.trim(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setReported(true);
    setReportOpen(false);
    toast.success(L("Report submitted", "တိုင်ကြားပြီး"));
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase text-muted-foreground">{L("Status", "အခြေအနေ")}</div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{booking.status.replace(/_/g, " ")}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">{L("Amount", "ပမာဏ")}</div>
          <div className="font-semibold">{booking.amount ? `${Number(booking.amount).toLocaleString()} MMK` : "—"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{L("Scheduled", "သတ်မှတ်")}</div>
          <div>{booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleString() : "—"}</div>
        </div>
      </div>

      {booking.status !== "completed" && booking.status !== "cancelled" && (
        <RescheduleControl booking={booking} isCustomer={isCustomer} isProvider={isProvider && booking.provider_id === userId} L={L} onChanged={onChange} />
      )}

      {canAdvance && (
        <Button onClick={advance} disabled={busy} className="w-full">{L(next.en, next.my)}</Button>
      )}
      {isMyBooking && booking.status !== "completed" && booking.status !== "cancelled" && (
        <Button onClick={cancel} disabled={busy} variant="outline" className="w-full">{L("Cancel booking", "ပယ်ဖျက်")}</Button>
      )}

      {booking.status === "completed" && myRole && hasMyReview === false && (
        <div className="space-y-2 rounded-xl border border-border bg-background p-3">
          <div className="text-sm font-semibold">
            {myRole === "customer" ? L("Rate the provider", "ပညာရှင်ကို အဆင့်ပေး") : L("Rate the customer", "ဖောက်သည်ကို အဆင့်ပေး")}
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)} className={n <= rating ? "text-amber-500" : "text-muted-foreground"}>
                <Star className={`h-6 w-6 ${n <= rating ? "fill-current" : ""}`} />
              </button>
            ))}
          </div>
          <Textarea placeholder={L("Optional comment", "မှတ်ချက်")} value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
          <Button onClick={submitReview} disabled={busy} className="w-full">{L("Submit", "ပေးပို့")}</Button>
        </div>
      )}
      {booking.status === "completed" && hasMyReview && (
        <p className="text-xs text-muted-foreground">{L("Your review was submitted.", "သင်၏ သုံးသပ်ချက် ပေးပို့ပြီး။")}</p>
      )}

      {booking.status === "completed" && myRole && (
        <div className="border-t border-border/60 pt-3">
          {reported ? (
            <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <AlertTriangle className="h-3 w-3" /> {L("You've reported this booking. Admin will review.", "တိုင်ကြားပြီး။ Admin စစ်ဆေးပါမည်။")}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 hover:underline"
            >
              <AlertTriangle className="h-3 w-3" />
              {myRole === "customer" ? L("Report the provider", "ပညာရှင်ကို တိုင်ကြား") : L("Report the customer", "ဖောက်သည်ကို တိုင်ကြား")}
            </button>
          )}
        </div>
      )}
      {reportOpen && (
        <div className="space-y-2 rounded-xl border border-amber-300/60 bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
          <div className="font-semibold">{L("What happened?", "ဘာဖြစ်ခဲ့သလဲ?")}</div>
          <select
            className="w-full rounded-md border border-border bg-background p-2 text-sm"
            value={reportKind}
            onChange={(e) => setReportKind(e.target.value as typeof reportKind)}
          >
            {myRole === "customer" ? (
              <>
                <option value="bad_quality">Poor quality of work</option>
                <option value="no_show">Provider did not show up</option>
                <option value="rude">Rude or unprofessional</option>
                <option value="fraud">Fraud / overcharged</option>
                <option value="other">Other</option>
              </>
            ) : (
              <>
                <option value="no_show">Customer no-show</option>
                <option value="rude">Rude or abusive</option>
                <option value="fraud">Fraud / refused to pay</option>
                <option value="other">Other</option>
              </>
            )}
          </select>
          <Textarea rows={3} value={reportText} onChange={(e) => setReportText(e.target.value)} placeholder={L("Details", "အသေးစိတ်")} />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setReportOpen(false)} disabled={busy}>{L("Cancel", "ပယ်")}</Button>
            <Button variant="destructive" size="sm" className="flex-1" onClick={submitReport} disabled={busy || !reportText.trim()}>
              {busy ? L("Sending…", "ပို့နေ…") : L("Submit", "တိုင်ကြား")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChatPanel({
  leadId,
  userId,
  messages,
  peerId,
  canSend,
  L,
}: {
  leadId: string;
  userId: string;
  messages: Msg[];
  peerId: string | null;
  canSend: boolean;
  L: (en: string, my: string) => string;
}) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    const { error } = await supabase.from("messages").insert({
      lead_id: leadId,
      sender_id: userId,
      recipient_id: peerId,
      body: text,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setBody("");
  };

  return (
    <div className="rounded-2xl border border-border bg-card">
      <ul className="max-h-[420px] space-y-2 overflow-y-auto p-3">
        {messages.length === 0 && <li className="text-center text-xs text-muted-foreground">{L("No messages yet.", "မက်ဆေ့ မရှိ။")}</li>}
        {messages.map((m) => {
          const mine = m.sender_id === userId;
          return (
            <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {m.body}
                <div className={`mt-0.5 text-[10px] opacity-70`}>{new Date(m.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>
              </div>
            </li>
          );
        })}
      </ul>
      {canSend && (
        <div className="flex gap-2 border-t border-border p-2">
          <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder={L("Type a message…", "ရိုက်ပါ…")} onKeyDown={(e) => e.key === "Enter" && send()} />
          <Button onClick={send} disabled={busy || !body.trim()}><Send className="h-4 w-4" /></Button>
        </div>
      )}
    </div>
  );
}

function CustomerCancelCard({
  leadId,
  onCancelled,
  L,
}: {
  leadId: string;
  onCancelled: () => void;
  L: (en: string, my: string) => string;
}) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const cancel = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("customer_leads")
      .update({ status: "cancelled" })
      .eq("id", leadId);
    setBusy(false);
    setConfirming(false);
    if (error) return toast.error(error.message);
    onCancelled();
  };

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:border-destructive/40 hover:text-destructive"
      >
        <XCircle className="h-4 w-4" />
        {L("Cancel this request", "ဤတောင်းဆိုမှု ပယ်ဖျက်")}
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
      <p className="font-medium">{L("Cancel this request?", "ပယ်ဖျက်မလား?")}</p>
      <p className="text-xs text-muted-foreground">
        {L(
          "Providers will no longer be able to send quotes. You can post a new request anytime.",
          "ပညာရှင်များ စျေးပေးခြင်း မရတော့ပါ။ နောက်တစ်ကြိမ် တင်နိုင်ပါသည်။",
        )}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={() => setConfirming(false)} disabled={busy}>
          {L("Keep it", "ထားရှိ")}
        </Button>
        <Button variant="destructive" size="sm" className="flex-1" onClick={cancel} disabled={busy}>
          {busy ? L("Cancelling…", "ပယ်ဖျက်နေ…") : L("Yes, cancel", "ပယ်ဖျက်ပါ")}
        </Button>
      </div>
    </div>
  );
}

function RescheduleControl({
  booking,
  isCustomer,
  isProvider,
  onChanged,
  L,
}: {
  booking: Booking;
  isCustomer: boolean;
  isProvider: boolean;
  onChanged: () => void;
  L: (en: string, my: string) => string;
}) {
  const toLocal = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(toLocal(booking.scheduled_at));
  const [busy, setBusy] = useState(false);

  if (!isCustomer && !isProvider) return null;

  const role: "customer" | "provider" = isCustomer ? "customer" : "provider";
  const myConfirmed = role === "customer" ? booking.time_confirmed_by_customer : booking.time_confirmed_by_provider;
  const otherConfirmed = role === "customer" ? booking.time_confirmed_by_provider : booking.time_confirmed_by_customer;
  const bothConfirmed = !!booking.time_confirmed_by_customer && !!booking.time_confirmed_by_provider;

  const propose = async () => {
    if (!value) return toast.error(L("Pick a date & time", "ရက်/အချိန် ရွေးပါ"));
    setBusy(true);
    const iso = new Date(value).toISOString();
    const patch: Record<string, unknown> = {
      scheduled_at: iso,
      time_confirmed_by_customer: role === "customer",
      time_confirmed_by_provider: role === "provider",
    };
    const { error } = await supabase.from("bookings").update(patch).eq("id", booking.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    setOpen(false);
    onChanged();
    toast.success(L("Time proposed — waiting for the other side", "အချိန် တင်ပြီး — အခြားဖက် စောင့်"));
  };

  const confirm = async () => {
    setBusy(true);
    const patch: Record<string, unknown> = role === "customer"
      ? { time_confirmed_by_customer: true }
      : { time_confirmed_by_provider: true };
    const { error } = await supabase.from("bookings").update(patch).eq("id", booking.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    onChanged();
    toast.success(L("Time confirmed", "အချိန် အတည်ပြုပြီး"));
  };

  const needsMyConfirm = !!booking.scheduled_at && !myConfirmed && otherConfirmed;

  return (
    <div className="space-y-2 rounded-xl border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs">
          {bothConfirmed
            ? <span className="font-semibold text-emerald-600">{L("Time confirmed by both sides", "နှစ်ဖက်လုံး အတည်ပြုပြီး")}</span>
            : booking.scheduled_at
            ? <span className="text-muted-foreground">{L("Proposed time — awaiting confirmation", "တင်ပြထား — အတည်ပြုရန် စောင့်")}</span>
            : <span className="text-muted-foreground">{L("No time set yet", "အချိန် မသတ်မှတ်ရသေး")}</span>}
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => { setValue(toLocal(booking.scheduled_at)); setOpen(true); }}
            className="text-xs font-semibold text-primary hover:underline"
          >
            {booking.scheduled_at ? L("Reschedule", "ပြန်ချိန်း") : L("Propose time", "အချိန် တင်ပြ")}
          </button>
        )}
      </div>
      {needsMyConfirm && !open && (
        <Button size="sm" onClick={confirm} disabled={busy} className="w-full">
          {L("Confirm this time", "ဤအချိန် အတည်ပြု")}
        </Button>
      )}
      {open && (
        <div className="space-y-2">
          <Input type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setOpen(false)} disabled={busy}>{L("Cancel", "ပယ်")}</Button>
            <Button size="sm" className="flex-1" onClick={propose} disabled={busy}>{busy ? L("Saving…", "သိမ်းနေ…") : L("Propose", "တင်ပြ")}</Button>
          </div>
        </div>
      )}
    </div>
  );
}