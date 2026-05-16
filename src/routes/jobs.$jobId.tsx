import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { CATEGORIES, CITIES } from "@/lib/catalog";
import { QuoteForm } from "./provider.dashboard";
import { Send, Star } from "lucide-react";

export const Route = createFileRoute("/jobs/$jobId")({
  component: JobDetailPage,
});

type Job = {
  id: string;
  customer_id: string;
  category_slug: string;
  description: string | null;
  city_slug: string;
  address: string | null;
  urgency: string;
  status: string;
  created_at: string;
};
type Quote = {
  id: string;
  provider_id: string;
  amount: number;
  eta_text: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  provider?: { business_name: string | null; rating_avg: number; rating_count: number } | null;
};
type Msg = { id: string; sender_id: string; body: string; created_at: string };
type Booking = { id: string; status: string; scheduled_at: string | null; amount: number | null; payment_method: string } | null;

function JobDetailPage() {
  const { jobId } = Route.useParams();
  const { user, loading } = useAuth();
  const { lang } = useI18n();
  const nav = useNavigate();

  const [job, setJob] = useState<Job | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [booking, setBooking] = useState<Booking>(null);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewExists, setReviewExists] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isCustomer = !!user && job?.customer_id === user.id;
  const myQuote = quotes.find((q) => q.provider_id === user?.id) ?? null;
  const isProvider = !!myQuote || (booking?.status && booking && false);
  const acceptedQuote = quotes.find((q) => q.status === "accepted") ?? null;

  const refresh = async () => {
    const [{ data: j }, { data: qs }, { data: ms }, { data: b }] = await Promise.all([
      supabase.from("job_requests").select("*").eq("id", jobId).maybeSingle(),
      supabase
        .from("quotes")
        .select("id, provider_id, amount, eta_text, notes, status, created_at, provider:providers(business_name, rating_avg, rating_count)")
        .eq("job_id", jobId)
        .order("created_at", { ascending: true }),
      supabase
        .from("messages")
        .select("id, sender_id, body, created_at")
        .eq("job_id", jobId)
        .order("created_at", { ascending: true }),
      supabase.from("bookings").select("id, status, scheduled_at, amount, payment_method").eq("job_id", jobId).maybeSingle(),
    ]);
    setJob(j as Job | null);
    setQuotes((qs ?? []) as unknown as Quote[]);
    setMessages((ms ?? []) as Msg[]);
    setBooking(b as Booking);
    if (b && user) {
      const { data: r } = await supabase.from("reviews").select("id").eq("booking_id", b.id).maybeSingle();
      setReviewExists(!!r);
    }
  };

  useEffect(() => {
    if (loading) return;
    if (!user) return void nav({ to: "/signin", search: { redirect: `/jobs/${jobId}` } });
    refresh();

    const chan = supabase
      .channel(`job-${jobId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `job_id=eq.${jobId}` },
        (payload) => setMessages((m) => [...m, payload.new as Msg]),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quotes", filter: `job_id=eq.${jobId}` },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `job_id=eq.${jobId}` },
        () => refresh(),
      )
      .subscribe();
    return () => void supabase.removeChannel(chan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user?.id, jobId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  const sendMessage = async () => {
    if (!user || !draft.trim()) return;
    const body = draft.trim();
    setDraft("");
    const { error } = await supabase.from("messages").insert({ job_id: jobId, sender_id: user.id, body });
    if (error) setErr(error.message);
  };

  const acceptQuote = async (q: Quote, paymentMethod: "cash" | "wallet" | "online" = "cash") => {
    if (!user || !job) return;
    setErr(null);
    const { error: qErr } = await supabase.from("quotes").update({ status: "accepted" }).eq("id", q.id);
    if (qErr) return setErr(qErr.message);
    await supabase.from("quotes").update({ status: "declined" }).eq("job_id", jobId).neq("id", q.id).eq("status", "pending");
    const { error: bErr } = await supabase.from("bookings").insert({
      job_id: job.id,
      quote_id: q.id,
      customer_id: job.customer_id,
      provider_id: q.provider_id,
      amount: q.amount,
      payment_method: paymentMethod,
      status: "accepted",
    });
    if (bErr) return setErr(bErr.message);
    await supabase.from("job_requests").update({ status: "accepted" }).eq("id", job.id);
    refresh();
  };

  const advanceStatus = async (s: "on_the_way" | "started" | "completed" | "cancelled") => {
    if (!booking) return;
    await supabase.from("bookings").update({ status: s }).eq("id", booking.id);
    if (s === "completed" || s === "cancelled") {
      await supabase.from("job_requests").update({ status: s }).eq("id", jobId);
    }
    refresh();
  };

  const submitReview = async () => {
    if (!user || !booking || !job) return;
    const { error } = await supabase.from("reviews").insert({
      booking_id: booking.id,
      customer_id: job.customer_id,
      provider_id: booking.id ? quotes.find((q) => q.status === "accepted")?.provider_id : null,
      rating: reviewRating,
      comment: reviewText || null,
    });
    if (!error) {
      // bump provider aggregate
      const provId = quotes.find((q) => q.status === "accepted")?.provider_id;
      if (provId) {
        const { data: agg } = await supabase
          .from("reviews")
          .select("rating")
          .eq("provider_id", provId);
        const ratings = (agg ?? []).map((r) => r.rating);
        const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
        await supabase
          .from("providers")
          .update({ rating_avg: Number(avg.toFixed(2)), rating_count: ratings.length })
          .eq("id", provId);
      }
      setReviewExists(true);
    } else setErr(error.message);
  };

  if (!job) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <p className="text-sm text-muted-foreground">
            {lang === "en" ? "Loading…" : "တင်နေသည်…"}
          </p>
        </main>
      </div>
    );
  }

  const catName = CATEGORIES.find((x) => x.slug === job.category_slug);
  const cityName = CITIES.find((x) => x.slug === job.city_slug);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold tracking-tight">
                {catName ? (lang === "en" ? catName.en : catName.my) : job.category_slug}
              </h1>
              <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold uppercase">
                {booking?.status ?? job.status}
              </span>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {cityName ? (lang === "en" ? cityName.en : cityName.my) : job.city_slug}
              {job.address ? ` · ${job.address}` : ""} · {job.urgency}
            </div>
            {job.description && <p className="mt-3 text-sm">{job.description}</p>}
          </div>

          {/* Chat */}
          <div className="flex h-[420px] flex-col rounded-2xl border border-border bg-card">
            <div className="border-b border-border p-3 text-sm font-semibold">
              {lang === "en" ? "Conversation" : "စကားပြောချက်"}
            </div>
            <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-3">
              {messages.length === 0 && (
                <p className="text-center text-xs text-muted-foreground">
                  {lang === "en" ? "No messages yet." : "မက်ဆေ့ဂျ်များ မရှိသေးပါ။"}
                </p>
              )}
              {messages.map((m) => {
                const mine = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        mine ? "bg-primary text-primary-foreground" : "bg-secondary"
                      }`}
                    >
                      {m.body}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2 border-t border-border p-2">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={lang === "en" ? "Type a message…" : "မက်ဆေ့ဂျ် ရိုက်ပါ…"}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <Button size="icon" onClick={sendMessage}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>

        <aside className="space-y-4">
          {/* Quotes list */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-sm font-semibold">
              {lang === "en" ? "Quotes" : "စျေးနှုန်းများ"} ({quotes.length})
            </div>
            <ul className="mt-3 space-y-3">
              {quotes.map((q) => (
                <li key={q.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between">
                    <Link
                      to="/p/$providerId"
                      params={{ providerId: q.provider_id }}
                      className="text-sm font-semibold hover:text-primary"
                    >
                      {q.provider?.business_name ?? "Provider"}
                    </Link>
                    <span className="text-sm font-bold">{Number(q.amount).toLocaleString()} MMK</span>
                  </div>
                  {q.eta_text && <div className="mt-1 text-xs text-muted-foreground">ETA: {q.eta_text}</div>}
                  {q.notes && <p className="mt-1 text-xs">{q.notes}</p>}
                  <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{q.status}</div>
                  {isCustomer && !booking && q.status === "pending" && (
                    <Button size="sm" className="mt-2 w-full" onClick={() => acceptQuote(q)}>
                      {lang === "en" ? "Accept (Cash on service)" : "လက်ခံ (လုပ်ပြီးငွေချေ)"}
                    </Button>
                  )}
                </li>
              ))}
              {quotes.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {lang === "en" ? "Waiting for quotes…" : "စျေးနှုန်းများ စောင့်ဆိုင်းနေ…"}
                </p>
              )}
            </ul>
          </div>

          {/* Provider: quote form */}
          {!isCustomer && !booking && (
            <QuoteForm
              jobId={job.id}
              existing={
                myQuote
                  ? { amount: myQuote.amount, eta_text: myQuote.eta_text, notes: myQuote.notes }
                  : undefined
              }
              onSubmitted={refresh}
            />
          )}

          {/* Booking actions */}
          {booking && (
            <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
              <div className="text-sm font-semibold">
                {lang === "en" ? "Booking" : "ဘွတ်ကင်"}
              </div>
              <div className="text-xs text-muted-foreground">
                {Number(booking.amount ?? 0).toLocaleString()} MMK · {booking.payment_method}
              </div>
              {!isCustomer && booking.status !== "completed" && booking.status !== "cancelled" && (
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" variant="outline" onClick={() => advanceStatus("on_the_way")}>
                    {lang === "en" ? "On the way" : "လမ်းပေါ်"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => advanceStatus("started")}>
                    {lang === "en" ? "Started" : "စတင်"}
                  </Button>
                  <Button size="sm" onClick={() => advanceStatus("completed")} className="col-span-2">
                    {lang === "en" ? "Mark complete" : "ပြီးပြီ"}
                  </Button>
                </div>
              )}
              {isCustomer && booking.status === "completed" && !reviewExists && (
                <div className="space-y-2 border-t border-border pt-3">
                  <div className="text-sm font-semibold">
                    {lang === "en" ? "Leave a review" : "သုံးသပ်ချက် ပေးပါ"}
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" onClick={() => setReviewRating(n)}>
                        <Star
                          className={`h-5 w-5 ${
                            n <= reviewRating ? "fill-primary text-primary" : "text-muted-foreground"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <Input
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder={lang === "en" ? "Comment (optional)" : "မှတ်ချက် (ရွေး)"}
                  />
                  <Button size="sm" className="w-full" onClick={submitReview}>
                    {lang === "en" ? "Submit review" : "သုံးသပ်ချက် တင်ရန်"}
                  </Button>
                </div>
              )}
              {reviewExists && (
                <p className="text-xs text-muted-foreground">
                  {lang === "en" ? "Thanks for your review!" : "သုံးသပ်ပေးတဲ့အတွက် ကျေးဇူးတင်ပါတယ်!"}
                </p>
              )}
              {isCustomer && booking.status !== "completed" && booking.status !== "cancelled" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full text-destructive"
                  onClick={() => advanceStatus("cancelled")}
                >
                  {lang === "en" ? "Cancel booking" : "ဘွတ်ကင် ပယ်ဖျက်"}
                </Button>
              )}
            </div>
          )}
        </aside>
      </main>
      <Footer />
    </div>
  );
}