import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Lock } from "lucide-react";
import { DetailsCard } from "@/components/request/DetailsCard";
import { ProviderQuoteForm } from "@/components/request/ProviderQuoteForm";
import { QuoteCard } from "@/components/request/QuoteCard";
import { BookingPanel } from "@/components/request/BookingPanel";
import { ChatPanel } from "@/components/request/ChatPanel";
import { CustomerCancelCard } from "@/components/request/CustomerCancelCard";
import type { Lead, Quote, Booking, Msg } from "@/components/request/types";

const search = z.object({ tab: z.string().optional() });

export const Route = createFileRoute("/request/$leadId")({
  validateSearch: search,
  component: LeadPage,
  head: () => ({ meta: [{ title: "Request — Fixido" }] }),
});

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
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <LoadingState label={L("Loading…", "ခဏစောင့်ပါ…")} />
      </div>
    );
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