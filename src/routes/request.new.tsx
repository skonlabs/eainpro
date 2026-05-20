import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  CATEGORIES,
  CITIES,
  CATEGORY_SUBCATEGORIES,
  CATEGORY_QUESTIONS,
  URGENCY_OPTIONS,
  TIMING_OPTIONS,
  WINDOW_OPTIONS,
  CONTACT_OPTIONS,
  BUDGET_OPTIONS,
  TOWNSHIPS,
} from "@/lib/catalog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Check,
  Upload,
  X,
  ShieldCheck,
  Loader2,
  Camera,
  Wrench,
  FileText,
  MapPin,
  Image as ImageIcon,
  Zap,
  CalendarClock,
  Wallet,
} from "lucide-react";

const searchSchema = z.object({
  cat: z.string().optional(),
  sub: z.string().optional(),
  category: z.string().optional(),
  city: z.string().optional(),
  directTo: z.string().optional(),
});

export const Route = createFileRoute("/request/new")({
  validateSearch: searchSchema,
  component: NewRequestPage,
  head: () => ({ meta: [{ title: "Request a service — Fixido" }] }),
});

type StepKind =
  | "category"
  | "subcategory"
  | "question"
  | "urgency"
  | "city"
  | "township"
  | "photos"
  | "timing"
  | "window"
  | "contact"
  | "budget"
  | "description"
  | "review";

type Step = { kind: StepKind; questionId?: string };

function NewRequestPage() {
  const search = Route.useSearch();
  const CATEGORY_ALIASES: Record<string, string> = {
    pest: "pest-control",
    aircon: "aircon-utilities",
    repair: "home-repair",
    install: "installation",
  };
  const rawCat = search.cat ?? search.category;
  const aliased = rawCat ? CATEGORY_ALIASES[rawCat] ?? rawCat : undefined;
  const cat = aliased && CATEGORIES.some((c) => c.slug === aliased) ? aliased : undefined;
  const sub = search.sub;
  const initialCity = search.city;
  const directTo = search.directTo;
  const { lang } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const L = (en: string, my: string) => (lang === "en" ? en : my);

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [directProvider, setDirectProvider] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!directTo) { setDirectProvider(null); return; }
    (async () => {
      const { data } = await supabase
        .from("providers")
        .select("id, business_name")
        .eq("id", directTo)
        .maybeSingle();
      if (data) setDirectProvider({ id: data.id, name: data.business_name ?? "Provider" });
    })();
  }, [directTo]);

  const [form, setForm] = useState({
    category: cat ?? "",
    subcategories: sub ? sub.split(",").filter(Boolean) : ([] as string[]),
    description: "",
    answers: {} as Record<string, string>,
    urgency: "flexible" as "today" | "tomorrow" | "this_week" | "flexible",
    city: initialCity ?? "yangon",
    township: "",
    area: "",
    address: "",
    photoUrls: [] as string[],
    videoUrls: [] as string[],
    uploading: false,
    timing: "this_week",
    window: "any" as "morning" | "afternoon" | "evening" | "any",
    customDate: "",
    contact: "in_app" as "in_app" | "phone" | "viber",
    contactPhone: "",
    budget: "any",
  });

  useEffect(() => {
    setForm((current) => {
      const nextCategory = cat ?? "";
      const nextSubs = sub ? sub.split(",").filter(Boolean) : [];

      if (
        current.category === nextCategory &&
        current.subcategories.join(",") === nextSubs.join(",") &&
        current.city === (initialCity ?? "yangon")
      ) {
        return current;
      }

      return {
        ...current,
        category: nextCategory,
        subcategories: nextSubs,
        city: initialCity ?? current.city,
      };
    });
  }, [cat, sub, initialCity]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const category = useMemo(
    () => CATEGORIES.find((c) => c.slug === form.category),
    [form.category],
  );
  const subs = CATEGORY_SUBCATEGORIES[form.category] ?? [];
  const questions = CATEGORY_QUESTIONS[form.category] ?? [];
  const hasPrefilledSubcategory = !!sub && subs.some((item) => item.slug === sub);

  // Build the dynamic step list based on current category
  const steps: Step[] = useMemo(() => {
    const list: Step[] = [];
    if (!form.category) list.push({ kind: "category" });
    if (form.category && subs.length > 0) list.push({ kind: "subcategory" });
    questions.forEach((q) => list.push({ kind: "question", questionId: q.id }));
    list.push({ kind: "urgency" });
    list.push({ kind: "city" });
    list.push({ kind: "township" });
    list.push({ kind: "photos" });
    list.push({ kind: "timing" });
    list.push({ kind: "window" });
    list.push({ kind: "contact" });
    list.push({ kind: "budget" });
    list.push({ kind: "description" });
    list.push({ kind: "review" });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category, subs.length, questions.length]);

  const [stepIdx, setStepIdx] = useState(0);
  const stepIdxRef = useRef(0);
  const step = steps[Math.min(stepIdx, steps.length - 1)];
  const progress = ((stepIdx + 1) / steps.length) * 100;

  useEffect(() => {
    setStepIdx(hasPrefilledSubcategory ? Math.min(1, steps.length - 1) : 0);
  }, [hasPrefilledSubcategory, steps.length]);

  useEffect(() => {
    stepIdxRef.current = stepIdx;
  }, [stepIdx]);

  const goNext = () => setStepIdx((i) => Math.min(steps.length - 1, i + 1));
  const goBack = () => {
    if (stepIdx === 0) {
      nav({ to: "/" });
      return;
    }
    setStepIdx((i) => Math.max(0, i - 1));
  };

  // Per-step validation for the primary CTA
  const getAnswerValues = (qid: string): string[] => {
    const value = form.answers[qid];
    if (!value) return [];
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const canContinue = (): boolean => {
    switch (step.kind) {
      case "category":
        return !!form.category;
      case "subcategory":
        return form.subcategories.length > 0;
      case "question":
        return getAnswerValues(step.questionId!).length > 0;
      case "township":
        return form.township.trim().length > 0;
      case "description":
        return form.description.trim().length >= 20;
      case "contact":
        if (form.contact === "in_app") return true;
        return form.contactPhone.trim().length >= 5;
      default:
        return true;
    }
  };

  const isOptional = (): boolean => {
    return (
      step.kind === "photos" ||
      step.kind === "budget" ||
      step.kind === "window"
    );
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    if (!user) {
      setErr(L("Please sign in to upload photos.", "ဓာတ်ပုံ တင်ရန် အကောင့်ဝင်ပါ။"));
      return;
    }
    set("uploading", true);
    const photoUrls: string[] = [];
    const videoUrls: string[] = [];
    const errors: string[] = [];
    for (const f of files) {
      const ext = f.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("job-photos").upload(path, f, {
        cacheControl: "3600",
        upsert: false,
        contentType: f.type || undefined,
      });
      if (error) {
        console.error("Upload failed", f.name, error);
        errors.push(`${f.name}: ${error.message}`);
      } else {
        const { data } = supabase.storage.from("job-photos").getPublicUrl(path);
        if (f.type.startsWith("video/")) videoUrls.push(data.publicUrl);
        else photoUrls.push(data.publicUrl);
      }
    }
    setForm((f) => ({
      ...f,
      photoUrls: [...f.photoUrls, ...photoUrls],
      videoUrls: [...f.videoUrls, ...videoUrls],
      uploading: false,
    }));
    if (errors.length) {
      setErr(
        L(
          `Upload failed: ${errors.join("; ")}`,
          `တင်ရန် မအောင်မြင်ပါ — ${errors.join("; ")}`,
        ),
      );
    } else {
      setErr(null);
    }
    e.target.value = "";
  };

  const submit = async () => {
    setErr(null);
    if (!user) {
      nav({ to: "/signin", search: { redirect: "/request/new" } });
      return;
    }
    const subSlugs = form.subcategories;
    if (subSlugs.length === 0) {
      setErr(L("Please pick a service type.", "ဝန်ဆောင်မှု ရွေးပါ။"));
      return;
    }
    setSubmitting(true);
    const { data: sts, error: stErr } = await supabase
      .from("service_types")
      .select("id, slug")
      .eq("category_slug", form.category)
      .in("slug", subSlugs);
    if (stErr || !sts || sts.length === 0) {
      setSubmitting(false);
      setErr(L("Service type not configured. Please contact support.", "ဝန်ဆောင်မှု အသေးစိတ် မရှိသေးပါ။"));
      return;
    }
    const stIds = sts.map((r: { id: string }) => r.id);
    const primaryId = sts[0].id;
    const { data: pricingRows } = await supabase
      .from("lead_pricing")
      .select("price_credits, max_provider_unlocks, is_active")
      .in("service_type_id", stIds);
    const active = (pricingRows ?? []).filter((p: { is_active: boolean }) => p.is_active);
    let priceCredits = active.length
      ? active.reduce((sum: number, p: { price_credits: number }) => sum + (p.price_credits ?? 0), 0)
      : 500 * subSlugs.length;
    if (directProvider) priceCredits = priceCredits * 2;
    const maxUnlocks = active.length
      ? Math.min(...active.map((p: { max_provider_unlocks: number }) => p.max_provider_unlocks))
      : 5;
    const subLabels = subSlugs
      .map((slug: string) => subs.find((s) => s.slug === slug))
      .map((s: { en: string; my: string } | undefined) => (s ? (lang === "en" ? s.en : s.my) : ""))
      .filter(Boolean)
      .join(", ");
    const shortDesc = (form.description || subLabels || subSlugs.join(", ")).slice(0, 140);
    const fullDesc = [subLabels && `Services: ${subLabels}`, form.description]
      .filter(Boolean)
      .join("\n\n") || null;
    const expiresAt = new Date(
      Date.now() + (form.urgency === "today" ? 48 : 7 * 24) * 3600 * 1000,
    ).toISOString();
    const { data: lead, error: leadErr } = await supabase
      .from("customer_leads")
      .insert({
        customer_id: user.id,
        customer_name: user.user_metadata?.full_name ?? user.email ?? "Customer",
        customer_phone: form.contactPhone || "",
        city_slug: form.city,
        address: form.address || null,
        service_type_id: primaryId,
        urgency: form.urgency,
        preferred_date: form.customDate || null,
        preferred_time: form.window || null,
        short_description: shortDesc,
        full_description: fullDesc,
        lead_price_credits: priceCredits,
        max_provider_unlocks: maxUnlocks,
        expires_at: expiresAt,
        directed_provider_id: directProvider?.id ?? null,
      })
      .select("id")
      .single();
    if (leadErr || !lead) {
      setSubmitting(false);
      setErr(leadErr?.message ?? L("Failed to create request.", "မအောင်မြင်ပါ။"));
      return;
    }
    if (form.photoUrls.length) {
      await supabase.from("lead_photos").insert(
        form.photoUrls.map((url, i) => ({ lead_id: lead.id, url, sort_order: i })),
      );
    }
    setSubmitting(false);
    nav({ to: "/request/$leadId", params: { leadId: lead.id } });
  };

  // Auto-advance helper for single-select chip flows
  const advanceAfterSelection = () => {
    queueMicrotask(() => {
      setStepIdx((current) => Math.min(steps.length - 1, Math.max(current, stepIdxRef.current) + 1));
    });
  };

  const pick = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    advanceAfterSelection();
  };

  const pickAnswer = (qid: string, val: string) => {
    setForm((f) => ({ ...f, answers: { ...f.answers, [qid]: val } }));
    advanceAfterSelection();
  };

  const toggleAnswer = (qid: string, val: string) => {
    setForm((f) => {
      const current = (f.answers[qid] ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const next = current.includes(val)
        ? current.filter((item) => item !== val)
        : [...current, val];

      return {
        ...f,
        answers: {
          ...f.answers,
          [qid]: next.join(","),
        },
      };
    });
  };

  // Gate: home owners must be signed in to start a request.
  // Browsing providers/reviews is allowed without an account, but creating
  // a request requires an authenticated customer.
  if (!authLoading && !user) {
    const redirectTarget = (() => {
      const params = new URLSearchParams();
      if (cat) params.set("cat", cat);
      if (sub) params.set("sub", sub);
      if (initialCity) params.set("city", initialCity);
      if (directTo) params.set("directTo", directTo);
      const qs = params.toString();
      return qs ? `/request/new?${qs}` : "/request/new";
    })();
    return (
      <div className="min-h-screen bg-background pb-20">
        <main className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-20">
          <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-xl font-bold tracking-tight">
              {L("Sign in to send your request", "တောင်းဆိုရန် အကောင့်ဝင်ပါ")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {L(
                "You can browse providers and reviews freely, but you need an account to send a service request so providers can reach you.",
                "ဝန်ဆောင်မှုပေးသူများနှင့် သုံးသပ်ချက်များကို လွတ်လပ်စွာ ကြည့်ရှုနိုင်သော်လည်း တောင်းဆိုမှု ပေးပို့ရန် အကောင့်တစ်ခု လိုအပ်ပါသည်။",
              )}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Link to="/signin" search={{ redirect: redirectTarget }}>
                <Button className="h-11 w-full rounded-xl font-semibold">
                  {L("Sign in to continue", "ဝင်ရောက်ပြီး ဆက်လုပ်ရန်")}
                </Button>
              </Link>
              <Link to="/signup" search={{ as: "customer", redirect: redirectTarget }}>
                <Button variant="outline" className="h-11 w-full rounded-xl font-semibold">
                  {L("Create a free account", "အကောင့်အသစ် ဖွင့်ရန်")}
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              {L("Takes less than a minute.", "တစ်မိနစ်အတွင်း ပြီးပါမည်။")}
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-44">
      {/* Slim progress bar */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            onClick={goBack}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground transition hover:bg-accent"
            aria-label={L("Back", "နောက်")}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
            {stepIdx + 1}/{steps.length}
          </span>
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-4 pt-4 sm:px-6 sm:pt-8">
        {directProvider && (
          <div className="mb-4 flex items-start gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-3 text-xs text-foreground/90">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              {L(
                `You're sending this request directly to ${directProvider.name}. Only they will receive it.`,
                `${directProvider.name} ထံသို့သာ တိုက်ရိုက် ပေးပို့ပါမည်။ သူသာလျှင် လက်ခံရရှိပါမည်။`,
              )}
            </p>
          </div>
        )}
        {renderStep()}
      </main>

      {/* Sticky footer CTA — sits above the global BottomNav (which is fixed at bottom-0, z-50). */}
      <div
        className="fixed inset-x-0 bottom-[68px] z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
      >
        <div className="mx-auto flex max-w-2xl items-center gap-2 sm:px-6">
          {isOptional() && step.kind !== "review" && (
            <Button
              variant="ghost"
              onClick={goNext}
              className="rounded-xl font-semibold text-muted-foreground"
            >
              {L("Skip", "ကျော်")}
            </Button>
          )}
          <div className="flex-1" />
          {step.kind === "review" ? (
            <Button
              onClick={submit}
              disabled={submitting}
              size="lg"
              className="rounded-xl px-6 font-semibold shadow-lg shadow-primary/25"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {L("Sending…", "ပေးပို့နေ…")}
                </>
              ) : (
                L("Submit Request", "တောင်းဆို တင်ရန်")
              )}
            </Button>
          ) : (
            <Button
              onClick={goNext}
              disabled={!canContinue()}
              size="lg"
              className="rounded-xl px-8 font-semibold"
            >
              {L("Next", "ဆက်လုပ်")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  function renderStep() {
    switch (step.kind) {
      case "category":
        return (
          <StepShell
            title={L("What do you need help with?", "ဘယ်ဝန်ဆောင်မှု လိုသလဲ?")}
            hint={L("Pick one to get started.", "တစ်ခု ရွေးပါ။")}
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CATEGORIES.map((c) => (
                <BigChoice
                  key={c.slug}
                  active={form.category === c.slug}
                  onClick={() => {
                    // Picking a category removes the "category" step from the
                    // steps array (because it's only added when form.category
                    // is empty). The next step naturally takes index 0, so we
                    // must NOT increment stepIdx here — otherwise we'd skip
                    // the new first step (subcategory or first question).
                    setForm((f) => ({
                      ...f,
                      category: c.slug,
                      subcategories: [],
                      answers: {},
                    }));
                  }}
                >
                  {L(c.en, c.my)}
                </BigChoice>
              ))}
            </div>
          </StepShell>
        );

      case "subcategory":
        return (
          <StepShell
            title={L(
              `What kind of ${category?.en.toLowerCase()} work?`,
              "ဘယ်လို အကူအညီ လိုသလဲ?",
            )}
            hint={L(
              "Tap all that apply. You'll be charged per selected service.",
              "လိုအပ်သမျှကို နှိပ်ပါ။ ရွေးထားသည့် ဝန်ဆောင်မှုအလိုက် ကြေး တွက်ပါမည်။",
            )}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {subs.map((s) => (
                <BigChoice
                  key={s.slug}
                  active={form.subcategories.includes(s.slug)}
                  onClick={() => {
                    setForm((f) => ({
                      ...f,
                      subcategories: f.subcategories.includes(s.slug)
                        ? f.subcategories.filter((x: string) => x !== s.slug)
                        : [...f.subcategories, s.slug],
                    }));
                  }}
                >
                  {L(s.en, s.my)}
                </BigChoice>
              ))}
            </div>
            {form.subcategories.length > 0 && (
              <p className="mt-3 text-xs font-semibold text-primary">
                {L(
                  `${form.subcategories.length} selected`,
                  `${form.subcategories.length} ခု ရွေးထား`,
                )}
              </p>
            )}
          </StepShell>
        );

      case "question": {
        const q = questions.find((x) => x.id === step.questionId);
        if (!q) return null;
        const selectedAnswers = getAnswerValues(q.id);
        return (
          <StepShell title={L(q.en, q.my)} hint={L("Tap to choose.", "နှိပ်၍ ရွေးပါ။")}>
            <div className="grid gap-2 sm:grid-cols-2">
              {q.options.map((opt) => (
                <BigChoice
                  key={opt.value}
                  active={selectedAnswers.includes(opt.value)}
                  onClick={() =>
                    q.multi ? toggleAnswer(q.id, opt.value) : pickAnswer(q.id, opt.value)
                  }
                >
                  {L(opt.en, opt.my)}
                </BigChoice>
              ))}
            </div>
            {q.multi && selectedAnswers.length > 0 && (
              <p className="mt-3 text-xs font-semibold text-primary">
                {L(`${selectedAnswers.length} selected`, `${selectedAnswers.length} ခု ရွေးထား`) }
              </p>
            )}
          </StepShell>
        );
      }

      case "urgency":
        return (
          <StepShell
            title={L("How soon do you need this?", "ဘယ်လောက် မြန်ဆန် လိုသလဲ?")}
            hint={L("Helps providers prioritize.", "ဝန်ဆောင်မှုပေးသူများ ဦးစားပေးနိုင်ရန်။")}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {URGENCY_OPTIONS.map((u) => (
                <BigChoice
                  key={u.value}
                  active={form.urgency === u.value}
                  onClick={() => pick("urgency", u.value as typeof form.urgency)}
                >
                  {L(u.en, u.my)}
                </BigChoice>
              ))}
            </div>
          </StepShell>
        );

      case "city":
        return (
          <StepShell
            title={L("Which city?", "ဘယ်မြို့လဲ?")}
            hint={L("We'll match providers nearby.", "အနီးအနား ဝန်ဆောင်မှုပေးသူ ရှာပေးပါမည်။")}
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CITIES.map((c) => (
                <BigChoice
                  key={c.slug}
                  active={form.city === c.slug}
                  onClick={() => {
                    // Reset township when city changes so the dropdown
                    // doesn't show a value from a different city.
                    if (form.city !== c.slug) set("township", "");
                    pick("city", c.slug);
                  }}
                >
                  {L(c.en, c.my)}
                </BigChoice>
              ))}
            </div>
          </StepShell>
        );

      case "township":
        {
          const cityTownships = TOWNSHIPS[form.city] ?? [];
          const cityName = CITIES.find((c) => c.slug === form.city);
          const cityLabel = cityName ? L(cityName.en, cityName.my) : form.city;
          return (
            <StepShell
              title={L(
                `Which township in ${cityLabel}?`,
                "ဘယ်မြို့နယ်လဲ?",
              )}
              hint={L(
                "Pick your township so we can match nearby providers.",
                "မြို့နယ်ကို ရွေးပါ — အနီးအနား ဝန်ဆောင်မှုပေးသူ ရှာပေးပါမည်။",
              )}
            >
              <Select
                value={form.township || undefined}
                onValueChange={(v) => set("township", v)}
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue
                    placeholder={L("Select township…", "မြို့နယ် ရွေးပါ…")}
                  />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {cityTownships.map((t) => (
                    <SelectItem key={t.slug} value={L(t.en, t.my)}>
                      {L(t.en, t.my)}
                    </SelectItem>
                  ))}
                  <SelectItem value={L("Other", "အခြား")}>
                    {L("Other / not listed", "အခြား")}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder={L(
                  "Area / landmark (optional)",
                  "ရပ်ကွက် / မှတ်တိုင် (ရွေး)",
                )}
                value={form.area}
                onChange={(e) => set("area", e.target.value)}
                className="mt-2 h-12 text-base"
              />
              <Input
                placeholder={L(
                  "Street / building / unit (optional, kept private)",
                  "လမ်း / အဆောက်အအုံ (ရွေး)",
                )}
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                className="mt-2 h-12 text-base"
              />
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs text-foreground/80">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p>
                  {L(
                    "Your exact address is shared only after you confirm a provider.",
                    "လိပ်စာအတိအကျကို အတည်ပြုပြီးမှသာ ပြသပါမည်။",
                  )}
                </p>
              </div>
            </StepShell>
          );
        }

      case "photos":
        return (
          <StepShell
            title={L("Add a photo or two?", "ဓာတ်ပုံ ထည့်မလား?")}
            hint={L(
              "Photos help providers give a more accurate price. Optional.",
              "ဓာတ်ပုံများက ပိုကောင်းသော စျေးနှုန်း ရစေပါသည်။",
            )}
          >
            {!user && (
              <p className="mb-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-foreground/80">
                {L(
                  "Sign in to upload photos — or skip and add them later.",
                  "ဓာတ်ပုံတင်ရန် အကောင့်ဝင်ပါ — သို့မဟုတ် ကျော်ပါ။",
                )}
              </p>
            )}
            {err && (
              <p className="mb-3 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                {err}
              </p>
            )}
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card p-8 transition hover:border-primary/50">
              {form.uploading ? (
                <Loader2 className="mb-2 h-7 w-7 animate-spin text-primary" />
              ) : (
                <Camera className="mb-2 h-7 w-7 text-muted-foreground" />
              )}
              <span className="text-sm font-semibold">
                {form.uploading
                  ? L("Uploading…", "တင်နေ…")
                  : L("Tap to add photos", "ဓာတ်ပုံ ထည့်ရန် နှိပ်ပါ")}
              </span>
              <span className="mt-1 text-xs text-muted-foreground">
                {L("JPG, PNG, or video", "JPG, PNG သို့မဟုတ် ဗီဒီယို")}
              </span>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={handleUpload}
              />
            </label>
            {form.photoUrls.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {form.photoUrls.map((u) => (
                  <div
                    key={u}
                    className="relative aspect-square overflow-hidden rounded-xl border"
                  >
                    <img src={u} alt="" className="h-full w-full object-cover" />
                    <button
                      onClick={() =>
                        set(
                          "photoUrls",
                          form.photoUrls.filter((x) => x !== u),
                        )
                      }
                      className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-background/90 shadow"
                      aria-label="Remove"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </StepShell>
        );

      case "timing":
        return (
          <StepShell
            title={L("When would you like this done?", "ဘယ်အချိန် ပြီးချင်ပါသလဲ?")}
            hint={L("Pick a timeframe or a specific date.", "အချိန် သို့မဟုတ် ရက် ရွေးပါ။")}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {TIMING_OPTIONS.map((t) => (
                <BigChoice
                  key={t.value}
                  active={form.timing === t.value && !form.customDate}
                  onClick={() => {
                    set("customDate", "");
                    pick("timing", t.value);
                  }}
                >
                  {L(t.en, t.my)}
                </BigChoice>
              ))}
            </div>
            <div className="mt-4">
              <label className="block text-xs font-semibold text-muted-foreground">
                {L("Or pick a specific date", "သို့မဟုတ် ရက်ရွေးပါ")}
              </label>
              <Input
                type="date"
                value={form.customDate}
                onChange={(e) => set("customDate", e.target.value)}
                className="mt-1 h-12 text-base"
              />
            </div>
          </StepShell>
        );

      case "window":
        return (
          <StepShell
            title={L("Any preferred time of day?", "နှစ်သက်သော အချိန် ရှိပါသလား?")}
            hint={L("Tap one or skip.", "တစ်ခု ရွေး၍ ဆက်ပါ။")}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {WINDOW_OPTIONS.map((w) => (
                <BigChoice
                  key={w.value}
                  active={form.window === w.value}
                  onClick={() => pick("window", w.value as typeof form.window)}
                >
                  {L(w.en, w.my)}
                </BigChoice>
              ))}
            </div>
          </StepShell>
        );

      case "contact":
        return (
          <StepShell
            title={L("How should providers reach you?", "ဘယ်လို ဆက်သွယ်ရမည်?")}
            hint={L(
              "Your number is only shared after you confirm a booking.",
              "ဖုန်းနံပါတ်ကို booking အတည်ပြုပြီးမှသာ ပြသပါမည်။",
            )}
          >
            <div className="grid gap-2 sm:grid-cols-3">
              {CONTACT_OPTIONS.map((c) => (
                <BigChoice
                  key={c.value}
                  active={form.contact === c.value}
                  onClick={() => set("contact", c.value as typeof form.contact)}
                >
                  {L(c.en, c.my)}
                </BigChoice>
              ))}
            </div>
            {form.contact !== "in_app" && (
              <Input
                className="mt-3 h-12 text-base"
                placeholder={L("Your phone number", "ဖုန်းနံပါတ်")}
                value={form.contactPhone}
                onChange={(e) => set("contactPhone", e.target.value)}
                inputMode="tel"
              />
            )}
          </StepShell>
        );

      case "budget":
        return (
          <StepShell
            title={L("What's your budget?", "ဘတ်ဂျက် ဘယ်လောက်လဲ?")}
            hint={L(
              "Optional. Helps filter out quotes that won't fit.",
              "ရွေးနိုင်သည်။ ကိုက်ညီသော စျေးနှုန်းများ ရရှိရန်။",
            )}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {BUDGET_OPTIONS.map((b) => (
                <BigChoice
                  key={b.value}
                  active={form.budget === b.value}
                  onClick={() => pick("budget", b.value)}
                >
                  {L(b.en, b.my)}
                </BigChoice>
              ))}
            </div>
          </StepShell>
        );

      case "description":
        return (
          <StepShell
            title={L("Anything else to add?", "နောက်ထပ် ပြောစရာ ရှိပါသလား?")}
            hint={L(
              "Describe the issue in a sentence or two. Providers use this to quote.",
              "ပြဿနာကို တိုတိုနဲ့ ပြောပြပါ။",
            )}
          >
            <Textarea
              autoFocus
              rows={5}
              placeholder={L(
                "Example: Water is leaking under the kitchen sink. Need someone to check and repair.",
                "ဥပမာ — မီးဖိုခန်း ဇလုံအောက်တွင် ရေယိုနေပါသည်။",
              )}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="text-base"
            />
            <div className="mt-2 flex items-center justify-end text-xs">
              <span
                className={
                  form.description.trim().length < 20
                    ? "font-semibold text-muted-foreground"
                    : "font-semibold text-primary"
                }
              >
                {form.description.trim().length < 20
                  ? L(
                      `${20 - form.description.trim().length} more characters`,
                      `${20 - form.description.trim().length} လုံး ထပ်ထည့်ပါ`,
                    )
                  : L("Looks good", "အဆင်ပြေပါပြီ")}
              </span>
            </div>
          </StepShell>
        );

      case "review":
        return (
          <StepShell
            title={L("Review and send", "ပြန်ကြည့်၍ ပေးပို့ပါ")}
            hint={L(
              "Providers will see this and send you quotes.",
              "ဝန်ဆောင်မှုပေးသူများ မြင်တွေ့၍ စျေးနှုန်း ပေးပါမည်။",
            )}
          >
            {(() => {
              const goTo = (kind: StepKind) => {
                const idx = steps.findIndex((s) => s.kind === kind);
                if (idx >= 0) setStepIdx(idx);
              };
              const serviceText = category
                ? `${lang === "en" ? category.en : category.my}${
                    form.subcategories.length
                      ? ` · ${form.subcategories
                          .map(
                            (slug: string) =>
                              subs.find((s) => s.slug === slug)?.[lang === "en" ? "en" : "my"] ?? slug,
                          )
                          .join(", ")}`
                      : ""
                  }`
                : "—";
              const locationText = `${CITIES.find((c) => c.slug === form.city)?.[lang === "en" ? "en" : "my"] ?? form.city}${form.township ? `, ${form.township}` : ""}${form.area ? ` · ${form.area}` : ""}`;
              const urgencyText =
                URGENCY_OPTIONS.find((u) => u.value === form.urgency)?.[lang === "en" ? "en" : "my"] ?? form.urgency;
              const whenText = `${form.customDate || (TIMING_OPTIONS.find((t) => t.value === form.timing)?.[lang === "en" ? "en" : "my"] ?? form.timing)} · ${WINDOW_OPTIONS.find((w) => w.value === form.window)?.[lang === "en" ? "en" : "my"] ?? form.window}`;
              const budgetText =
                BUDGET_OPTIONS.find((b) => b.value === form.budget)?.[lang === "en" ? "en" : "my"] ?? "—";
              return (
                <div className="space-y-3">
                  <ReviewItem
                    icon={<Wrench className="h-4 w-4" />}
                    label={L("Service", "ဝန်ဆောင်မှု")}
                    value={serviceText}
                    onEdit={() => goTo("subcategory")}
                    editLabel={L("Edit", "ပြင်")}
                  />
                  <ReviewItem
                    icon={<FileText className="h-4 w-4" />}
                    label={L("Description", "ဖော်ပြချက်")}
                    value={form.description || L("—", "—")}
                    multiline
                    onEdit={() => goTo("description")}
                    editLabel={L("Edit", "ပြင်")}
                  />
                  <ReviewItem
                    icon={<MapPin className="h-4 w-4" />}
                    label={L("Location", "တည်နေရာ")}
                    value={locationText}
                    onEdit={() => goTo("city")}
                    editLabel={L("Edit", "ပြင်")}
                  />
                  <div className="overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="flex items-center justify-between gap-2 px-4 pt-3">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <ImageIcon className="h-4 w-4" />
                        {L("Photos", "ဓာတ်ပုံ")}
                      </div>
                      <button
                        type="button"
                        onClick={() => goTo("photos")}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        {L("Edit", "ပြင်")}
                      </button>
                    </div>
                    <div className="px-4 pb-4 pt-2">
                      {form.photoUrls.length ? (
                        <div className="grid grid-cols-4 gap-2">
                          {form.photoUrls.map((u) => (
                            <div
                              key={u}
                              className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
                            >
                              <img
                                src={u}
                                alt=""
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          {L("No photos added.", "ဓာတ်ပုံ မထည့်ထား။")}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <ReviewItem
                      icon={<Zap className="h-4 w-4" />}
                      label={L("Urgency", "အရေးပေါ်")}
                      value={urgencyText}
                      onEdit={() => goTo("urgency")}
                      editLabel={L("Edit", "ပြင်")}
                    />
                    <ReviewItem
                      icon={<CalendarClock className="h-4 w-4" />}
                      label={L("When", "ဘယ်အချိန်")}
                      value={whenText}
                      onEdit={() => goTo("timing")}
                      editLabel={L("Edit", "ပြင်")}
                    />
                  </div>
                  <ReviewItem
                    icon={<Wallet className="h-4 w-4" />}
                    label={L("Budget", "ဘတ်ဂျက်")}
                    value={budgetText}
                    onEdit={() => goTo("budget")}
                    editLabel={L("Edit", "ပြင်")}
                  />
                </div>
              );
            })()}
            {err && (
              <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                {err}
              </p>
            )}
            {!user && (
              <p className="mt-3 rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-foreground/80">
                {L(
                  "You'll be asked to sign in to send this request.",
                  "ပေးပို့ရန် အကောင့်ဝင်ရန် လိုပါမည်။",
                )}
              </p>
            )}
          </StepShell>
        );

      default:
        return null;
    }
  }
}

function StepShell({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      {hint && <p className="mt-1.5 text-sm text-muted-foreground">{hint}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function BigChoice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex min-h-[60px] items-center justify-between rounded-2xl border-2 p-4 text-left text-sm font-semibold transition-all active:scale-[0.98] ${
        active
          ? "border-primary bg-primary/10 text-foreground shadow-sm"
          : "border-border bg-card hover:border-primary/40 hover:bg-accent/40"
      }`}
    >
      <span>{children}</span>
      {active && (
        <span className="ml-2 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-3 w-3" />
        </span>
      )}
    </button>
  );
}

function Row({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className={`grid gap-1 ${multiline ? "" : "sm:grid-cols-[120px_1fr]"}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-sm text-foreground">{value || "—"}</div>
    </div>
  );
}

function ReviewItem({
  icon,
  label,
  value,
  multiline,
  onEdit,
  editLabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  multiline?: boolean;
  onEdit?: () => void;
  editLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="text-primary">{icon}</span>
          {label}
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="shrink-0 text-xs font-semibold text-primary hover:underline"
          >
            {editLabel ?? "Edit"}
          </button>
        )}
      </div>
      <div
        className={`mt-1.5 text-sm font-medium text-foreground ${multiline ? "whitespace-pre-wrap break-words" : "break-words"}`}
      >
        {value || "—"}
      </div>
    </div>
  );
}