import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { CATEGORIES, CITIES, BUDGET_OPTIONS, URGENCY_OPTIONS } from "@/lib/catalog";
import {
  ArrowLeft,
  BadgeCheck,
  Star,
  Clock,
  MapPin,
  Send,
  Check,
  X,
  MessageCircle,
  ShieldCheck,
  Loader2,
  Heart,
  Phone,
  Image as ImageIcon,
  CheckCircle2,
  Calendar,
  AlertTriangle,
} from "lucide-react";

const searchSchema = z.object({
  tab: z.enum(["details", "providers", "quotes", "messages", "booking"]).optional(),
});

export const Route = createFileRoute("/request/$jobId")({
  validateSearch: searchSchema,
  component: RequestDetailPage,
  head: () => ({ meta: [{ title: "Request — Eain Pro" }] }),
});

type Job = {
  id: string;
  customer_id: string;
  category_slug: string;
  subcategory_slug: string | null;
  description: string | null;
  city_slug: string;
  area: string | null;
  address: string | null;
  urgency: string;
  budget_range: string | null;
  status: string;
  created_at: string;
  photo_urls: string[] | null;
  category_answers: Record<string, string> | null;
};

type Provider = {
  id: string;
  business_name: string | null;
  is_verified: boolean;
  rating_avg: number;
  rating_count: number;
  jobs_completed: number;
  response_minutes: number;
};

type Quote = {
  id: string;
  provider_id: string;
  amount: number;
  price_type: string | null;
  included: string | null;
  not_included: string | null;
  duration_min: number | null;
  earliest_at: string | null;
  warranty: string | null;
  cancellation_policy: string | null;
  expires_at: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  provider: Provider | null;
};

type Message = {
  id: string;
  sender_id: string;
  body: string | null;
  created_at: string;
  attachment_url?: string | null;
  kind?: string | null;
};

type Invite = {
  id: string;
  provider_id: string;
  status: string;
  provider: Provider | null;
};

type Booking = {
  id: string;
  job_id: string;
  quote_id: string | null;
  customer_id: string;
  provider_id: string;
  amount: number | null;
  status: string;
  scheduled_at: string | null;
  scheduled_window: string | null;
  customer_phone: string | null;
  customer_confirmed_at: string | null;
  provider_confirmed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  provider?: Provider | null;
};

type Review = {
  id: string;
  rating: number;
  rating_quality: number | null;
  rating_speed: number | null;
  rating_value: number | null;
  rating_communication: number | null;
  comment: string | null;
};

function RequestDetailPage() {
  const { jobId } = Route.useParams();
  const { tab = "details" } = Route.useSearch();
  const { lang } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();

  const [job, setJob] = useState<Job | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [msgBody, setMsgBody] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const L = (en: string, my: string) => (lang === "en" ? en : my);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      nav({ to: "/signin", search: { redirect: `/request/${jobId}` } });
      return;
    }
    let cancelled = false;
    (async () => {
      const [jr, ir, qr, mr, br] = await Promise.all([
        supabase.from("job_requests").select("*").eq("id", jobId).maybeSingle(),
        supabase
          .from("request_invitations")
          .select(
            "id, provider_id, status, provider:providers(id, business_name, is_verified, rating_avg, rating_count, jobs_completed, response_minutes)",
          )
          .eq("job_id", jobId),
        supabase
          .from("quotes")
          .select(
            "id, provider_id, amount, price_type, included, not_included, duration_min, earliest_at, warranty, cancellation_policy, expires_at, notes, status, created_at, provider:providers(id, business_name, is_verified, rating_avg, rating_count, jobs_completed, response_minutes)",
          )
          .eq("job_id", jobId)
          .order("created_at", { ascending: false }),
        supabase
          .from("messages")
          .select("id, sender_id, body, created_at, attachment_url, kind")
          .eq("job_id", jobId)
          .order("created_at", { ascending: true }),
        supabase
          .from("bookings")
          .select(
            "id, job_id, quote_id, customer_id, provider_id, amount, status, scheduled_at, scheduled_window, customer_phone, customer_confirmed_at, provider_confirmed_at, cancelled_at, cancel_reason, provider:providers(id, business_name, is_verified, rating_avg, rating_count, jobs_completed, response_minutes)",
          )
          .eq("job_id", jobId)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      if (jr.data) setJob(jr.data as Job);
      if (ir.data) setInvites(ir.data as unknown as Invite[]);
      if (qr.data) setQuotes(qr.data as unknown as Quote[]);
      if (mr.data) setMessages(mr.data as Message[]);
      if (br.data) {
        const b = br.data as unknown as Booking;
        setBooking(b);
        const { data: rv } = await supabase
          .from("reviews")
          .select("id, rating, rating_quality, rating_speed, rating_value, rating_communication, comment")
          .eq("booking_id", b.id)
          .maybeSingle();
        if (rv) setReview(rv as Review);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, jobId, nav]);

  // Load matched providers for the providers tab
  useEffect(() => {
    if (!job) return;
    (async () => {
      const { data } = await supabase
        .from("providers")
        .select(
          "id, business_name, is_verified, rating_avg, rating_count, jobs_completed, response_minutes, provider_services!inner(category_slug)",
        )
        .eq("provider_services.category_slug", job.category_slug)
        .eq("is_verified", true)
        .order("rating_avg", { ascending: false });
      setProviders((data ?? []) as unknown as Provider[]);
    })();
  }, [job]);

  const toggleSelect = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else {
        if (next.size >= 5) {
          setErr(L("You can request quotes from up to 5 providers at a time.", "တစ်ကြိမ်လျှင် ၅ ဦးအထိသာ ရွေးနိုင်ပါသည်။"));
          return s;
        }
        next.add(id);
      }
      setErr(null);
      return next;
    });
  };

  const sendInvites = async () => {
    if (!selected.size) return;
    setSending(true);
    setErr(null);
    const rows = Array.from(selected).map((pid) => ({ job_id: jobId, provider_id: pid }));
    const { error } = await supabase
      .from("request_invitations")
      .upsert(rows, { onConflict: "job_id,provider_id" });
    if (!error) {
      await supabase
        .from("job_requests")
        .update({ status: "quoted" })
        .eq("id", jobId)
        .eq("status", "open");
      const { data: refreshed } = await supabase
        .from("request_invitations")
        .select(
          "id, provider_id, status, provider:providers(id, business_name, is_verified, rating_avg, rating_count, jobs_completed, response_minutes)",
        )
        .eq("job_id", jobId);
      setInvites((refreshed ?? []) as unknown as Invite[]);
      setSelected(new Set());
      setShowSuccess(true);
    } else {
      setErr(error.message);
    }
    setSending(false);
  };

  const sendMessage = async () => {
    if (!msgBody.trim() || !user) return;
    const body = msgBody.trim();
    setMsgBody("");
    const { data } = await supabase
      .from("messages")
      .insert({ job_id: jobId, sender_id: user.id, body, kind: "text" })
      .select("id, sender_id, body, created_at, attachment_url, kind")
      .single();
    if (data) setMessages((m) => [...m, data as Message]);
  };

  const sendPhoto = async (file: File) => {
    if (!user) return;
    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/chat/${jobId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("job-photos").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: pu } = supabase.storage.from("job-photos").getPublicUrl(path);
      const { data } = await supabase
        .from("messages")
        .insert({ job_id: jobId, sender_id: user.id, attachment_url: pu.publicUrl, kind: "image" })
        .select("id, sender_id, body, created_at, attachment_url, kind")
        .single();
      if (data) setMessages((m) => [...m, data as Message]);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const acceptQuote = async (q: Quote) => {
    if (!user || !job) return;
    // Mark quote accepted
    await supabase.from("quotes").update({ status: "accepted" }).eq("id", q.id);
    // Decline others
    await supabase
      .from("quotes")
      .update({ status: "declined" })
      .eq("job_id", jobId)
      .neq("id", q.id)
      .eq("status", "pending");
    // Create booking
    const { data: b } = await supabase
      .from("bookings")
      .insert({
        job_id: jobId,
        quote_id: q.id,
        customer_id: user.id,
        provider_id: q.provider_id,
        amount: q.amount,
        scheduled_at: q.earliest_at,
        customer_phone: job.contact_phone ?? null,
        status: "accepted",
      })
      .select(
        "id, job_id, quote_id, customer_id, provider_id, amount, status, scheduled_at, scheduled_window, customer_phone, customer_confirmed_at, provider_confirmed_at, cancelled_at, cancel_reason, provider:providers(id, business_name, is_verified, rating_avg, rating_count, jobs_completed, response_minutes)",
      )
      .maybeSingle();
    if (b) setBooking(b as unknown as Booking);
    await supabase.from("job_requests").update({ status: "accepted" }).eq("id", jobId);
    setJob((j) => (j ? { ...j, status: "accepted" } : j));
    // System message
    await supabase.from("messages").insert({
      job_id: jobId,
      sender_id: user.id,
      kind: "system",
      body: `Booking confirmed: ${q.amount.toLocaleString()} MMK`,
    });
    setTab("booking");
  };

  const confirmCompletion = async () => {
    if (!booking) return;
    const now = new Date().toISOString();
    await supabase
      .from("bookings")
      .update({ status: "completed", customer_confirmed_at: now })
      .eq("id", booking.id);
    await supabase.from("job_requests").update({ status: "completed" }).eq("id", jobId);
    setBooking({ ...booking, status: "completed", customer_confirmed_at: now });
    setJob((j) => (j ? { ...j, status: "completed" } : j));
  };

  const cancelBooking = async (reason: string) => {
    if (!booking) return;
    const now = new Date().toISOString();
    await supabase
      .from("bookings")
      .update({ status: "cancelled", cancelled_at: now, cancel_reason: reason })
      .eq("id", booking.id);
    await supabase.from("job_requests").update({ status: "cancelled" }).eq("id", jobId);
    setBooking({ ...booking, status: "cancelled", cancelled_at: now, cancel_reason: reason });
    setJob((j) => (j ? { ...j, status: "cancelled" } : j));
  };

  const cat = CATEGORIES.find((c) => c.slug === job?.category_slug);
  const city = CITIES.find((c) => c.slug === job?.city_slug);
  const invitedIds = new Set(invites.map((i) => i.provider_id));

  const setTab = (t: "details" | "providers" | "quotes" | "messages" | "booking") =>
    nav({ to: "/request/$jobId", params: { jobId }, search: { tab: t } });

  if (!job) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="grid min-h-[40vh] place-items-center text-sm text-muted-foreground">
          {L("Loading…", "တင်နေသည်…")}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-5 sm:px-6 sm:py-10">
        <Link
          to="/my-requests"
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {L("My Requests", "ကျွန်ုပ်၏ တောင်းဆိုချက်များ")}
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {lang === "en" ? cat?.en : cat?.my}
            </h1>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {lang === "en" ? city?.en : city?.my}
              {job.area ? ` · ${job.area}` : ""}
            </p>
          </div>
          <StatusBadge status={job.status} lang={lang} />
        </div>

        {/* Tabs */}
        <div className="mt-5 flex gap-1 overflow-x-auto rounded-xl bg-muted p-1 text-sm">
          {(["details", "providers", "quotes", "messages"] as const).map((t) => {
            const labels = {
              details: L("Details", "အသေးစိတ်"),
              providers: L("Providers", "ဝန်ဆောင်မှုပေးသူ"),
              quotes: L(`Quotes (${quotes.length})`, `စျေး (${quotes.length})`),
              messages: L("Messages", "မက်ဆေ့ချ်"),
            };
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                {labels[t]}
              </button>
            );
          })}
        </div>

        {/* DETAILS TAB */}
        {tab === "details" && (
          <div className="mt-5 space-y-4">
            <Card>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {L("What you need", "လိုအပ်ချက်")}
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm">{job.description || "—"}</p>
              {job.category_answers && Object.keys(job.category_answers).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {Object.entries(job.category_answers).map(([k, v]) => (
                    <span
                      key={k}
                      className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/70"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              )}
            </Card>

            {job.photo_urls && job.photo_urls.length > 0 && (
              <Card>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {L("Photos", "ဓာတ်ပုံ")}
                </h3>
                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {job.photo_urls.map((u) => (
                    <a key={u} href={u} target="_blank" rel="noreferrer">
                      <img
                        src={u}
                        alt=""
                        className="aspect-square w-full rounded-lg border object-cover"
                      />
                    </a>
                  ))}
                </div>
              </Card>
            )}

            <Card>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {L("Request info", "သတင်းအချက်အလက်")}
              </h3>
              <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                <Field
                  label={L("Urgency", "အရေးပေါ်")}
                  value={
                    URGENCY_OPTIONS.find((u) => u.value === job.urgency)?.[
                      lang === "en" ? "en" : "my"
                    ] ?? job.urgency
                  }
                />
                <Field
                  label={L("Budget", "ဘတ်ဂျက်")}
                  value={
                    BUDGET_OPTIONS.find((b) => b.value === job.budget_range)?.[
                      lang === "en" ? "en" : "my"
                    ] ?? "—"
                  }
                />
                <Field
                  label={L("Area", "ဧရိယာ")}
                  value={job.area || "—"}
                />
                <Field
                  label={L("Created", "ဖန်တီးခဲ့သည်")}
                  value={new Date(job.created_at).toLocaleString(lang === "en" ? "en" : "my")}
                />
              </dl>
            </Card>
          </div>
        )}

        {/* PROVIDERS TAB */}
        {tab === "providers" && (
          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {L(
                  "Select up to 5 providers and request quotes.",
                  "၅ ဦးအထိ ရွေး၍ စျေးတောင်းပါ။",
                )}
              </p>
              <span className="text-xs font-semibold text-muted-foreground">
                {providers.length} {L("matched", "တွေ့သည်")}
              </span>
            </div>
            {err && (
              <p className="mb-2 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
                {err}
              </p>
            )}
            {providers.length === 0 ? (
              <EmptyState
                title={L("No providers found yet", "ဝန်ဆောင်မှုပေးသူ မတွေ့သေး")}
                message={L(
                  "Try changing your location, service, or timing.",
                  "တည်နေရာ၊ ဝန်ဆောင်မှု သို့မဟုတ် အချိန် ပြောင်းကြည့်ပါ။",
                )}
              />
            ) : (
              <ul className="grid gap-2">
                {providers.map((p) => {
                  const isInvited = invitedIds.has(p.id);
                  const isSelected = selected.has(p.id);
                  return (
                    <li
                      key={p.id}
                      className={`rounded-2xl border p-3 transition ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {!isInvited && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(p.id)}
                            className="mt-1"
                          />
                        )}
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted text-sm font-bold">
                          {(p.business_name ?? "P").slice(0, 1)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-semibold">
                              {p.business_name ?? "Provider"}
                            </span>
                            {p.is_verified && (
                              <BadgeCheck className="h-4 w-4 text-primary" />
                            )}
                            {isInvited && (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                {L("Invited", "ဖိတ်ပြီး")}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Star className="h-3 w-3 fill-primary text-primary" />
                              {p.rating_avg.toFixed(1)} ({p.rating_count})
                            </span>
                            <span>{p.jobs_completed} {L("jobs", "အလုပ်")}</span>
                            {p.response_minutes > 0 && (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {p.response_minutes}m
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex gap-2">
                            <Link to="/p/$providerId" params={{ providerId: p.id }}>
                              <Button size="sm" variant="outline" className="rounded-lg text-xs">
                                {L("View", "ကြည့်")}
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Sticky bottom selection bar */}
            {selected.size > 0 && (
              <div
                className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur"
                style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
              >
                <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 sm:px-6">
                  <p className="text-sm font-semibold">
                    {selected.size} {L("providers selected", "ဝန်ဆောင်မှုပေးသူ ရွေးခဲ့")}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelected(new Set())}
                      className="rounded-lg"
                    >
                      {L("Clear", "ဖျက်")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={sendInvites}
                      disabled={sending}
                      className="rounded-lg font-semibold"
                    >
                      {sending ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="mr-1 h-3.5 w-3.5" />
                      )}
                      {L("Request Quotes", "စျေး တောင်းရန်")}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Success modal */}
            {showSuccess && (
              <div
                className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur"
                onClick={() => setShowSuccess(false)}
              >
                <div
                  className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10">
                    <Check className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mt-3 text-lg font-bold">
                    {L("Your request has been sent.", "သင်၏ တောင်းဆိုချက် ပေးပို့ပြီးပါပြီ။")}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {L(
                      "Providers will review your request and send quotes. You can chat with them while you wait.",
                      "ဝန်ဆောင်မှုပေးသူများသည် စျေးနှုန်း ပေးပို့ပါမည်။",
                    )}
                  </p>
                  <div className="mt-4 flex flex-col gap-2">
                    <Button
                      onClick={() => {
                        setShowSuccess(false);
                        setTab("quotes");
                      }}
                      className="rounded-xl"
                    >
                      {L("View Quotes", "စျေးများ ကြည့်")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowSuccess(false)}
                      className="rounded-xl"
                    >
                      {L("Continue Browsing", "ဆက်လည်ကြည့်")}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* QUOTES TAB */}
        {tab === "quotes" && (
          <QuotesTab
            quotes={quotes}
            invites={invites}
            lang={lang}
            jobId={jobId}
            onRefresh={async () => {
              const { data } = await supabase
                .from("quotes")
                .select(
                  "id, provider_id, amount, price_type, included, not_included, duration_min, earliest_at, warranty, cancellation_policy, expires_at, notes, status, created_at, provider:providers(id, business_name, is_verified, rating_avg, rating_count, jobs_completed, response_minutes)",
                )
                .eq("job_id", jobId)
                .order("created_at", { ascending: false });
              if (data) setQuotes(data as unknown as Quote[]);
            }}
            onInvite={() => setTab("providers")}
          />
        )}

        {/* MESSAGES TAB */}
        {tab === "messages" && (
          <div className="mt-5">
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs text-foreground/80">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>
                {L(
                  "For your safety, keep communication and booking inside the app until the service is confirmed.",
                  "သင်၏ဘေးကင်းရေးအတွက် booking အတည်ပြုသည်အထိ အပ်ပလီအတွင်းပဲ ဆက်သွယ်ပါ။",
                )}
              </p>
            </div>
            <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
              {messages.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {L("No messages yet.", "မက်ဆေ့ မရှိသေး။")}
                </p>
              ) : (
                messages.map((m) => {
                  const mine = m.sender_id === user?.id;
                  return (
                    <div
                      key={m.id}
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        mine
                          ? "ml-auto bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {m.body}
                    </div>
                  );
                })
              )}
            </div>
            <div className="mt-2 flex gap-2">
              <Textarea
                rows={1}
                value={msgBody}
                onChange={(e) => setMsgBody(e.target.value)}
                placeholder={L("Type a message", "မက်ဆေ့ ရိုက်ပါ")}
                className="flex-1 resize-none"
              />
              <Button onClick={sendMessage} disabled={!msgBody.trim()} className="rounded-xl">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-border bg-card p-4">{children}</div>;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

function StatusBadge({ status, lang }: { status: string; lang: "en" | "my" }) {
  const map: Record<string, { en: string; my: string; cls: string }> = {
    open: { en: "Draft", my: "မူကြမ်း", cls: "bg-muted text-foreground" },
    quoted: { en: "Quotes coming", my: "စျေး စောင့်နေ", cls: "bg-primary/10 text-primary" },
    accepted: { en: "Provider selected", my: "ရွေးပြီး", cls: "bg-primary text-primary-foreground" },
    on_the_way: { en: "On the way", my: "လမ်းပေါ်", cls: "bg-primary text-primary-foreground" },
    started: { en: "In progress", my: "လုပ်နေ", cls: "bg-primary text-primary-foreground" },
    in_progress: { en: "In progress", my: "လုပ်နေ", cls: "bg-primary text-primary-foreground" },
    completed: { en: "Completed", my: "ပြီးဆုံး", cls: "bg-emerald-500/15 text-emerald-700" },
    cancelled: { en: "Cancelled", my: "ပယ်ဖျက်", cls: "bg-destructive/10 text-destructive" },
    disputed: { en: "Disputed", my: "ငြင်းခုံ", cls: "bg-destructive/10 text-destructive" },
  };
  const s = map[status] ?? map.open;
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${s.cls}`}>
      {lang === "en" ? s.en : s.my}
    </span>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
      <h3 className="text-sm font-bold">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

function QuotesTab({
  quotes,
  invites,
  lang,
  jobId,
  onRefresh,
  onInvite,
}: {
  quotes: Quote[];
  invites: Invite[];
  lang: "en" | "my";
  jobId: string;
  onRefresh: () => Promise<void>;
  onInvite: () => void;
}) {
  const L = (en: string, my: string) => (lang === "en" ? en : my);
  const [compare, setCompare] = useState<Set<string>>(new Set());
  const [showCompare, setShowCompare] = useState(false);

  const toggle = (id: string) =>
    setCompare((c) => {
      const n = new Set(c);
      if (n.has(id)) n.delete(id);
      else if (n.size < 3) n.add(id);
      return n;
    });

  const accept = async (q: Quote) => {
    await supabase.from("quotes").update({ status: "accepted" }).eq("id", q.id);
    await supabase.from("job_requests").update({ status: "accepted" }).eq("id", jobId);
    await onRefresh();
  };

  const decline = async (q: Quote) => {
    await supabase.from("quotes").update({ status: "declined" }).eq("id", q.id);
    await onRefresh();
  };

  if (quotes.length === 0) {
    return (
      <div className="mt-5">
        <EmptyState
          title={L("No quotes yet", "စျေး မရှိသေး")}
          message={L(
            "Providers are reviewing your request. You can invite more providers.",
            "ဝန်ဆောင်မှုပေးသူများ ပြန်ကြည့်နေပါသည်။",
          )}
        />
        <div className="mt-3 flex justify-center gap-2">
          <Button onClick={onInvite} className="rounded-xl">
            {L("Invite More Providers", "ထပ်မံ ဖိတ်ရန်")}
          </Button>
        </div>
        {invites.length > 0 && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {L(
              `Waiting for ${invites.length} provider(s)`,
              `${invites.length} ဦးကို စောင့်နေပါသည်`,
            )}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-5">
      {compare.size >= 2 && (
        <div className="mb-3 flex justify-end">
          <Button
            size="sm"
            onClick={() => setShowCompare(true)}
            className="rounded-lg"
          >
            {L(`Compare ${compare.size} Quotes`, `${compare.size} ခု နှိုင်းယှဉ်`)}
          </Button>
        </div>
      )}
      <ul className="grid gap-3 sm:grid-cols-2">
        {quotes.map((q) => (
          <li
            key={q.id}
            className="rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="font-semibold">
                    {q.provider?.business_name ?? "Provider"}
                  </span>
                  {q.provider?.is_verified && (
                    <BadgeCheck className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-primary text-primary" />
                  {q.provider?.rating_avg.toFixed(1) ?? "—"} ({q.provider?.rating_count ?? 0})
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-extrabold tracking-tight">
                  {q.amount.toLocaleString()}{" "}
                  <span className="text-xs font-medium text-muted-foreground">MMK</span>
                </div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {q.price_type ?? "fixed"}
                </div>
              </div>
            </div>
            {q.notes && (
              <p className="mt-2 line-clamp-3 text-xs text-foreground/70">{q.notes}</p>
            )}
            <div className="mt-3 flex items-center gap-2">
              <Checkbox
                checked={compare.has(q.id)}
                onCheckedChange={() => toggle(q.id)}
              />
              <span className="text-[11px] text-muted-foreground">
                {L("Compare", "နှိုင်းယှဉ်")}
              </span>
              <div className="ml-auto flex gap-1.5">
                {q.status === "pending" ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => decline(q)}
                      className="rounded-lg text-xs"
                    >
                      <X className="mr-1 h-3 w-3" />
                      {L("Decline", "ငြင်း")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => accept(q)}
                      className="rounded-lg text-xs"
                    >
                      <Check className="mr-1 h-3 w-3" />
                      {L("Accept", "လက်ခံ")}
                    </Button>
                  </>
                ) : (
                  <span className="rounded-lg bg-muted px-2 py-1 text-[11px] font-semibold capitalize">
                    {q.status}
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {showCompare && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur"
          onClick={() => setShowCompare(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-2xl border border-border bg-card p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold">{L("Compare Quotes", "စျေး နှိုင်းယှဉ်")}</h3>
              <button onClick={() => setShowCompare(false)} className="p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {quotes
                .filter((q) => compare.has(q.id))
                .map((q) => (
                  <div
                    key={q.id}
                    className="rounded-xl border border-border p-3 text-xs"
                  >
                    <div className="font-bold text-sm">
                      {q.provider?.business_name}
                    </div>
                    <CompareRow
                      label={L("Price", "စျေး")}
                      value={`${q.amount.toLocaleString()} MMK`}
                    />
                    <CompareRow
                      label={L("Type", "အမျိုးအစား")}
                      value={q.price_type ?? "fixed"}
                    />
                    <CompareRow
                      label={L("Rating", "အဆင့်")}
                      value={`${q.provider?.rating_avg.toFixed(1) ?? "—"} (${q.provider?.rating_count ?? 0})`}
                    />
                    <CompareRow
                      label={L("Jobs", "အလုပ်")}
                      value={String(q.provider?.jobs_completed ?? 0)}
                    />
                    <CompareRow
                      label={L("Included", "ပါဝင်")}
                      value={q.included ?? "—"}
                    />
                    <CompareRow
                      label={L("Warranty", "အာမခံ")}
                      value={q.warranty ?? "—"}
                    />
                    <CompareRow
                      label={L("Cancellation", "ပယ်ဖျက်")}
                      value={q.cancellation_policy ?? "—"}
                    />
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CompareRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-2 border-t border-border pt-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}