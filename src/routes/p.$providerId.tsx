import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { CATEGORIES, CITIES } from "@/lib/catalog";
import { Heart, Star, BadgeCheck, MapPin, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingState } from "@/components/site/LoadingState";

export const Route = createFileRoute("/p/$providerId")({
  component: ProviderProfilePage,
});

type Provider = {
  id: string;
  business_name: string | null;
  business_type: string | null;
  bio: string | null;
  years_experience: number | null;
  is_verified: boolean;
  rating_avg: number;
  rating_count: number;
  jobs_completed: number;
  logo_url: string | null;
};

function ProviderProfilePage() {
  const { providerId } = Route.useParams();
  const { user, roles } = useAuth();
  const { lang } = useI18n();
  const nav = useNavigate();
  const [p, setP] = useState<Provider | null>(null);
  const [services, setServices] = useState<{ category_slug: string; base_price: number | null }[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [favorite, setFavorite] = useState(false);
  const [reviews, setReviews] = useState<{ id: string; rating: number; comment: string | null; created_at: string }[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [myLeads, setMyLeads] = useState<
    | null
    | Array<{
        id: string;
        short_description: string;
        created_at: string;
        city_slug: string;
        service_type_id: string;
        category_slug: string | null;
      }>
  >(null);
  const [forwarding, setForwarding] = useState<string | null>(null);
  const [alreadySent, setAlreadySent] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<
    | null
    | {
        leadId: string;
        directPrice: number;
        orig: {
          customer_name: string | null;
          customer_phone: string | null;
          city_slug: string;
          address: string | null;
          service_type_id: string;
          urgency: string | null;
          preferred_date: string | null;
          preferred_time: string | null;
          short_description: string;
          full_description: string | null;
          lead_price_credits: number | null;
          max_provider_unlocks: number | null;
          expires_at: string | null;
          category_slug: string | null;
        };
      }
  >(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: pr }, { data: svc }, { data: ar }, { data: rv }] = await Promise.all([
        supabase.from("providers").select("*").eq("id", providerId).maybeSingle(),
        supabase.from("provider_services").select("category_slug, base_price").eq("provider_id", providerId),
        supabase.from("provider_service_areas").select("city_slug").eq("provider_id", providerId),
        supabase.from("reviews").select("id, rating, comment, created_at").eq("provider_id", providerId).eq("rated_by", "customer").order("created_at", { ascending: false }).limit(20),
      ]);
      if (!pr) {
        setNotFound(true);
        return;
      }
      setP(pr as Provider | null);
      setServices(svc ?? []);
      setAreas((ar ?? []).map((a) => a.city_slug));
      setReviews(rv ?? []);
      if (user) {
        const { data: f } = await supabase.from("favorites").select("provider_id").eq("customer_id", user.id).eq("provider_id", providerId).maybeSingle();
        setFavorite(!!f);
      }
    })();
  }, [providerId, user]);

  const toggleFav = async () => {
    if (!user || !p) return;
    if (favorite) {
      setFavorite(false);
      const { error } = await supabase.from("favorites").delete().eq("customer_id", user.id).eq("provider_id", p.id);
      if (error) { setFavorite(true); toast.error(error.message); }
    } else {
      setFavorite(true);
      const { error } = await supabase.from("favorites").insert({ customer_id: user.id, provider_id: p.id });
      if (error) { setFavorite(false); toast.error(error.message); }
      else toast.success(lang === "en" ? "Saved to favorites" : "နှစ်သက်ရာ သိမ်းပြီး");
    }
  };

  const [notFound, setNotFound] = useState(false);

  const providerCategorySet = new Set(services.map((s) => s.category_slug));

  const openPicker = async () => {
    if (!user || !p) return;
    setPickerOpen(true);
    if (myLeads !== null) return;
    const [{ data, error }, { data: sent }] = await Promise.all([
      supabase
        .from("customer_leads")
        .select("id, short_description, created_at, city_slug, service_type_id, service_type:service_types(category_slug)")
        .eq("customer_id", user.id)
        .eq("status", "active")
        .is("directed_provider_id", null)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("customer_leads")
        .select("short_description, service_type_id")
        .eq("customer_id", user.id)
        .eq("directed_provider_id", p.id),
    ]);
    if (error) {
      toast.error(error.message);
      setMyLeads([]);
      return;
    }
    setAlreadySent(
      new Set((sent ?? []).map((r: any) => `${r.service_type_id}::${r.short_description}`)),
    );
    const providerCats = new Set(services.map((s) => s.category_slug));
    setMyLeads(
      (data ?? [])
        .map((r: any) => ({
          id: r.id,
          short_description: r.short_description,
          created_at: r.created_at,
          city_slug: r.city_slug,
          service_type_id: r.service_type_id,
          category_slug: r.service_type?.category_slug ?? null,
        }))
        .filter((r) => r.category_slug && providerCats.has(r.category_slug)),
    );
  };

  const previewLead = async (leadId: string, category_slug: string | null) => {
    if (!user || !p) return;
    setForwarding(leadId);
    try {
      const { data: orig, error: origErr } = await supabase
        .from("customer_leads")
        .select(
          "customer_name, customer_phone, city_slug, address, service_type_id, urgency, preferred_date, preferred_time, short_description, full_description, lead_price_credits, max_provider_unlocks, expires_at",
        )
        .eq("id", leadId)
        .eq("customer_id", user.id)
        .maybeSingle();
      if (origErr || !orig) throw origErr ?? new Error("Original request not found");

      const { data: dup } = await supabase
        .from("customer_leads")
        .select("id")
        .eq("customer_id", user.id)
        .eq("directed_provider_id", p.id)
        .eq("service_type_id", orig.service_type_id)
        .eq("short_description", orig.short_description)
        .limit(1)
        .maybeSingle();
      if (dup) {
        toast.error(
          lang === "en"
            ? "You've already sent this request to this provider."
            : "ဤတောင်းဆိုမှုကို ဤပညာရှင်ထံ ပေးပို့ပြီးပါပြီ။",
        );
        setAlreadySent((prev) => {
          const next = new Set(prev);
          next.add(`${orig.service_type_id}::${orig.short_description}`);
          return next;
        });
        return;
      }

      const directPrice = (orig.lead_price_credits ?? 500) * 2;
      setConfirm({ leadId, directPrice, orig: { ...orig, category_slug } });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setForwarding(null);
    }
  };

  const confirmForward = async () => {
    if (!user || !p || !confirm) return;
    setSubmitting(true);
    try {
      const { orig, directPrice, leadId } = confirm;
      const { data: inserted, error: insErr } = await supabase
        .from("customer_leads")
        .insert({
          customer_id: user.id,
          customer_name: orig.customer_name,
          customer_phone: orig.customer_phone,
          city_slug: orig.city_slug,
          address: orig.address,
          service_type_id: orig.service_type_id,
          urgency: orig.urgency,
          preferred_date: orig.preferred_date,
          preferred_time: orig.preferred_time,
          short_description: orig.short_description,
          full_description: orig.full_description,
          lead_price_credits: directPrice,
          max_provider_unlocks: 1,
          expires_at: orig.expires_at,
          directed_provider_id: p.id,
        })
        .select("id")
        .single();
      if (insErr || !inserted) throw insErr ?? new Error("Could not send request");

      const { data: photos } = await supabase
        .from("lead_photos")
        .select("url, sort_order")
        .eq("lead_id", leadId);
      if (photos?.length) {
        await supabase.from("lead_photos").insert(
          photos.map((ph) => ({ lead_id: inserted.id, url: ph.url, sort_order: ph.sort_order })),
        );
      }

      toast.success(lang === "en" ? "Sent to provider" : "ပညာရှင်ထံ ပို့ပြီးပါပြီ");
      setConfirm(null);
      setPickerOpen(false);
      nav({ to: "/request/$leadId", params: { leadId: inserted.id } });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-14 text-center">
          <h1 className="text-xl font-bold">{lang === "en" ? "Provider not found" : "ဝန်ဆောင်မှုပေးသူ မတွေ့ပါ"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {lang === "en" ? "This provider doesn't exist or has been removed." : "ဤပညာရှင် မရှိပါ သို့မဟုတ် ဖျက်ပစ်ခဲ့ပြီးပါ။"}
          </p>
        </main>
      </div>
    );
  }

  if (!p) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-14">
          <LoadingState label={lang === "en" ? "Loading…" : "တင်နေသည်…"} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-14">
        <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-secondary text-xl font-bold text-primary">
            {(p.business_name ?? "?").slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-xl font-bold tracking-tight">
                {p.business_name ?? "Provider"}
              </h1>
              {p.is_verified && <BadgeCheck className="h-5 w-5 text-primary" />}
            </div>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 fill-primary text-primary" />
                {p.rating_avg.toFixed(1)} ({p.rating_count})
              </span>
              <span>{p.jobs_completed} {lang === "en" ? "jobs" : "အလုပ်"}</span>
              {p.years_experience ? <span>{p.years_experience}+ {lang === "en" ? "yrs" : "နှစ်"}</span> : null}
            </div>
            {p.bio && <p className="mt-2 text-sm">{p.bio}</p>}
          </div>
          {user && (
            <button onClick={toggleFav} aria-label="favorite" className="shrink-0">
              <Heart className={`h-6 w-6 ${favorite ? "fill-primary text-primary" : "text-muted-foreground"}`} />
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-sm font-semibold">{lang === "en" ? "Services" : "ဝန်ဆောင်မှုများ"}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {services.map((s) => {
              const c = CATEGORIES.find((x) => x.slug === s.category_slug);
              return (
                <span key={s.category_slug} className="rounded-full border border-border px-3 py-1 text-xs">
                  {c ? (lang === "en" ? c.en : c.my) : s.category_slug}
                  {s.base_price ? ` · ${Number(s.base_price).toLocaleString()} MMK` : ""}
                </span>
              );
            })}
          </div>
          <div className="mt-4 text-sm font-semibold">{lang === "en" ? "Service areas" : "နယ်မြေ"}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {areas.map((a) => {
              const c = CITIES.find((x) => x.slug === a);
              return (
                <span key={a} className="rounded-full bg-secondary px-3 py-1 text-xs">
                  {c ? (lang === "en" ? c.en : c.my) : a}
                </span>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">{lang === "en" ? "Reviews" : "သုံးသပ်ချက်များ"}</div>
            {reviews.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {reviews.length} {lang === "en" ? "reviews" : "ခု"}
              </span>
            )}
          </div>
          {reviews.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">{lang === "en" ? "No reviews yet." : "သုံးသပ်ချက် မရှိသေးပါ။"}</p>
          )}
          <ul className="mt-3 space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={`h-4 w-4 ${n <= r.rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                  ))}
                </div>
                {r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {(!user || roles.includes("customer")) && (
          <div className="rounded-2xl border border-border bg-card p-5">
            {user ? (
              <>
              <Button
                onClick={openPicker}
                className="w-full rounded-2xl py-6 text-base font-bold shadow-lg shadow-primary/25"
              >
                {lang === "en"
                  ? "Send one of my requests to this provider"
                  : "ကျွန်ုပ်၏ တောင်းဆိုမှုကို ဤပညာရှင်ထံ ပေးပို့ရန်"}
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {lang === "en"
                  ? `Pick one of your existing requests to send directly to ${p.business_name ?? "this provider"}.`
                  : `ရှိပြီးသား တောင်းဆိုမှု တစ်ခုကို ${p.business_name ?? "ဤပညာရှင်"} ထံသာ တိုက်ရိုက်ပေးပို့ပါ။`}
              </p>
              </>
            ) : (
              <>
                <Link
                  to="/signin"
                  search={{
                    redirect: `/p/${p.id}`,
                  }}
                >
                  <Button className="w-full rounded-2xl py-6 text-base font-bold shadow-lg shadow-primary/25">
                    {lang === "en"
                      ? "Sign in to send a request to this provider"
                      : "ဤပညာရှင်ထံ တောင်းဆိုရန် အကောင့်ဝင်ပါ"}
                  </Button>
                </Link>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  {lang === "en"
                    ? "Browsing is free. You only need an account when you're ready to send a request."
                    : "ကြည့်ရှုခြင်းသည် အခမဲ့ဖြစ်သည်။ တောင်းဆိုမှု ပေးပို့မှသာ အကောင့်လိုအပ်ပါသည်။"}
                </p>
              </>
            )}
          </div>
        )}
      </main>

      <Dialog
        open={pickerOpen}
        onOpenChange={(o) => {
          setPickerOpen(o);
          if (!o) setConfirm(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirm
                ? lang === "en"
                  ? "Confirm direct request"
                  : "တိုက်ရိုက် တောင်းဆိုမှု အတည်ပြုပါ"
                : lang === "en"
                  ? `Send a request to ${p.business_name ?? "this provider"}`
                  : `${p.business_name ?? "ဤပညာရှင်"} ထံ တောင်းဆိုမှု ပေးပို့ရန်`}
            </DialogTitle>
            <DialogDescription>
              {confirm
                ? lang === "en"
                  ? `Review what will be sent to ${p.business_name ?? "this provider"}.`
                  : `${p.business_name ?? "ဤပညာရှင်"} ထံ ပေးပို့မည့်အရာကို ပြန်ကြည့်ပါ။`
                : lang === "en"
                  ? "Pick one of your existing requests below. Only this provider will receive it — your original broadcast request is not affected."
                  : "အောက်တွင် ရှိပြီးသား တောင်းဆိုမှု တစ်ခုကို ရွေးပါ။ ဤပညာရှင်သာ လက်ခံပါမည်။"}
            </DialogDescription>
          </DialogHeader>

          {confirm ? (
            <ConfirmPanel
              lang={lang}
              provider={p.business_name ?? "this provider"}
              confirm={confirm}
              submitting={submitting}
              onBack={() => setConfirm(null)}
              onConfirm={confirmForward}
            />
          ) : (
          <>
          <div className="space-y-2">
            {myLeads === null && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              </p>
            )}
            {myLeads && myLeads.length === 0 && (
              <p className="py-2 text-sm text-muted-foreground">
                {lang === "en"
                  ? "You don't have any open requests that match this provider's services."
                  : "ဤပညာရှင်၏ ဝန်ဆောင်မှုနှင့် ကိုက်ညီသော ဖွင့်ထားသည့် တောင်းဆိုမှု မရှိသေးပါ။"}
              </p>
            )}
            {myLeads && myLeads.length > 0 && (
              <ul className="max-h-72 space-y-2 overflow-y-auto">
                {myLeads.map((l) => {
                  const cat = CATEGORIES.find((c) => c.slug === l.category_slug);
                  const sent = alreadySent.has(`${l.service_type_id}::${l.short_description}`);
                  return (
                    <li key={l.id}>
                      <button
                        type="button"
                        disabled={forwarding === l.id || sent}
                        onClick={() => previewLead(l.id, l.category_slug)}
                        className="w-full rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary/40 disabled:opacity-60"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold">
                            {l.short_description}
                          </span>
                          {forwarding === l.id && (
                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                          )}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {cat ? (lang === "en" ? cat.en : cat.my) : l.category_slug ?? ""}
                          {" · "}
                          {new Date(l.created_at).toLocaleDateString()}
                        </div>
                        {sent && (
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {lang === "en"
                              ? "Already sent to this provider."
                              : "ဤပညာရှင်ထံ ပေးပို့ပြီးပါပြီ။"}
                          </p>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <Link
            to="/request/new"
            search={{ category: services[0]?.category_slug, directTo: p.id }}
            onClick={() => setPickerOpen(false)}
          >
            <Button variant="outline" className="mt-2 w-full rounded-xl">
              <Plus className="mr-1 h-4 w-4" />
              {lang === "en" ? "Start a new request" : "တောင်းဆိုမှု အသစ် စတင်ရန်"}
            </Button>
          </Link>
          </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

function ConfirmPanel({
  lang,
  provider,
  confirm,
  submitting,
  onBack,
  onConfirm,
}: {
  lang: "en" | "my";
  provider: string;
  confirm: {
    directPrice: number;
    orig: {
      short_description: string;
      full_description: string | null;
      city_slug: string;
      address: string | null;
      urgency: string | null;
      preferred_date: string | null;
      preferred_time: string | null;
      lead_price_credits: number | null;
      category_slug: string | null;
    };
  };
  submitting: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const { orig, directPrice } = confirm;
  const cat = CATEGORIES.find((c) => c.slug === orig.category_slug);
  const city = CITIES.find((c) => c.slug === orig.city_slug);
  const baseCost = orig.lead_price_credits ?? Math.round(directPrice / 2);
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {lang === "en" ? "Request" : "တောင်းဆိုမှု"}
        </div>
        <div className="mt-1 text-sm font-semibold">{orig.short_description}</div>
        {orig.full_description && (
          <p className="mt-1 text-xs text-muted-foreground">{orig.full_description}</p>
        )}
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div>
            <dt className="text-muted-foreground">{lang === "en" ? "Service" : "ဝန်ဆောင်မှု"}</dt>
            <dd className="font-medium">
              {cat ? (lang === "en" ? cat.en : cat.my) : orig.category_slug ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{lang === "en" ? "City" : "မြို့"}</dt>
            <dd className="font-medium">
              {city ? (lang === "en" ? city.en : city.my) : orig.city_slug}
            </dd>
          </div>
          {orig.urgency && (
            <div>
              <dt className="text-muted-foreground">{lang === "en" ? "Urgency" : "အရေးပေါ်"}</dt>
              <dd className="font-medium capitalize">{orig.urgency}</dd>
            </div>
          )}
          {(orig.preferred_date || orig.preferred_time) && (
            <div>
              <dt className="text-muted-foreground">{lang === "en" ? "When" : "အချိန်"}</dt>
              <dd className="font-medium">
                {[orig.preferred_date, orig.preferred_time].filter(Boolean).join(" · ")}
              </dd>
            </div>
          )}
          {orig.address && (
            <div className="col-span-2">
              <dt className="text-muted-foreground">{lang === "en" ? "Address" : "လိပ်စာ"}</dt>
              <dd className="font-medium">{orig.address}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold">
            {lang === "en" ? "Direct lead cost" : "တိုက်ရိုက် Lead ဈေး"}
          </span>
          <span className="text-lg font-bold text-primary">
            {directPrice.toLocaleString()} {lang === "en" ? "credits" : "ခရက်ဒစ်"}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {lang === "en"
            ? `Direct requests are charged at 2× the standard rate (${baseCost.toLocaleString()} × 2). Only ${provider} will receive this lead.`
            : `တိုက်ရိုက် တောင်းဆိုမှုသည် စံနှုန်း၏ ၂ ဆ ဖြစ်သည် (${baseCost.toLocaleString()} × 2)။ ${provider} သာ လက်ခံပါမည်။`}
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 rounded-xl"
          onClick={onBack}
          disabled={submitting}
        >
          {lang === "en" ? "Back" : "နောက်သို့"}
        </Button>
        <Button
          className="flex-1 rounded-xl"
          onClick={onConfirm}
          disabled={submitting}
        >
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {lang === "en" ? "Confirm & send" : "အတည်ပြု ပေးပို့ရန်"}
        </Button>
      </div>
    </div>
  );
}