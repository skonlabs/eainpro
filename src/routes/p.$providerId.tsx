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
  const { user } = useAuth();
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
        category_slug: string | null;
      }>
  >(null);
  const [forwarding, setForwarding] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: pr }, { data: svc }, { data: ar }, { data: rv }] = await Promise.all([
        supabase.from("providers").select("*").eq("id", providerId).maybeSingle(),
        supabase.from("provider_services").select("category_slug, base_price").eq("provider_id", providerId),
        supabase.from("provider_service_areas").select("city_slug").eq("provider_id", providerId),
        supabase.from("reviews").select("id, rating, comment, created_at").eq("provider_id", providerId).order("created_at", { ascending: false }).limit(20),
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
    const { data, error } = await supabase
      .from("customer_leads")
      .select("id, short_description, created_at, city_slug, service_type:service_types(category_slug)")
      .eq("customer_id", user.id)
      .eq("status", "active")
      .is("directed_provider_id", null)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      toast.error(error.message);
      setMyLeads([]);
      return;
    }
    setMyLeads(
      (data ?? []).map((r: any) => ({
        id: r.id,
        short_description: r.short_description,
        created_at: r.created_at,
        city_slug: r.city_slug,
        category_slug: r.service_type?.category_slug ?? null,
      })),
    );
  };

  const forwardLead = async (leadId: string) => {
    if (!user || !p) return;
    setForwarding(leadId);
    try {
      // Load the original lead with all the fields needed to clone it.
      const { data: orig, error: origErr } = await supabase
        .from("customer_leads")
        .select(
          "customer_name, customer_phone, city_slug, address, service_type_id, urgency, preferred_date, preferred_time, short_description, full_description, lead_price_credits, max_provider_unlocks, expires_at",
        )
        .eq("id", leadId)
        .eq("customer_id", user.id)
        .maybeSingle();
      if (origErr || !orig) throw origErr ?? new Error("Original request not found");

      const directPrice = (orig.lead_price_credits ?? 500) * 2;
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

      // Copy photos too.
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
      setPickerOpen(false);
      nav({ to: "/request/$leadId", params: { leadId: inserted.id } });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setForwarding(null);
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
          <p className="text-sm text-muted-foreground">{lang === "en" ? "Loading…" : "တင်နေသည်…"}</p>
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

        <div className="rounded-2xl border border-border bg-card p-5">
          {user ? (
            <Button
              onClick={openPicker}
              className="w-full rounded-2xl py-6 text-base font-bold shadow-lg shadow-primary/25"
            >
              {lang === "en"
                ? `Send a request to ${p.business_name ?? "this provider"}`
                : `${p.business_name ?? "ဤပညာရှင်"} ထံ တောင်းဆိုမှု ပေးပို့ရန်`}
            </Button>
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
                    ? `Sign in to send a request to ${p.business_name ?? "this provider"}`
                    : "တောင်းဆိုရန် အကောင့်ဝင်ပါ"}
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
      </main>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {lang === "en"
                ? `Send to ${p.business_name ?? "this provider"}`
                : `${p.business_name ?? "ဤပညာရှင်"} ထံ ပေးပို့ရန်`}
            </DialogTitle>
            <DialogDescription>
              {lang === "en"
                ? "Forward one of your existing requests, or start a new one. Only this provider will receive it."
                : "ရှိပြီးသား တောင်းဆိုမှု တစ်ခုကို ထပ်ပို့ပါ၊ သို့မဟုတ် အသစ်တစ်ခု စတင်ပါ။"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {myLeads === null && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              </p>
            )}
            {myLeads && myLeads.length === 0 && (
              <p className="py-2 text-sm text-muted-foreground">
                {lang === "en"
                  ? "You don't have any open requests yet."
                  : "ဖွင့်ထားသော တောင်းဆိုမှု မရှိသေးပါ။"}
              </p>
            )}
            {myLeads && myLeads.length > 0 && (
              <ul className="max-h-72 space-y-2 overflow-y-auto">
                {myLeads.map((l) => {
                  const matches =
                    !l.category_slug || providerCategorySet.has(l.category_slug);
                  const cat = CATEGORIES.find((c) => c.slug === l.category_slug);
                  return (
                    <li key={l.id}>
                      <button
                        type="button"
                        disabled={forwarding === l.id}
                        onClick={() => forwardLead(l.id)}
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
                        {!matches && (
                          <p className="mt-1 text-[10px] text-amber-600">
                            {lang === "en"
                              ? "Note: this provider may not cover this service."
                              : "ဤပညာရှင်သည် ဤဝန်ဆောင်မှုမှာ မဖြစ်နိုင်ပါ။"}
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
        </DialogContent>
      </Dialog>

    </div>
  );
}