import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
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
} from "@/lib/catalog";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Upload,
  X,
  ShieldCheck,
  Loader2,
} from "lucide-react";

const searchSchema = z.object({
  cat: z.string().optional(),
  sub: z.string().optional(),
  category: z.string().optional(),
  city: z.string().optional(),
});

export const Route = createFileRoute("/request/new")({
  validateSearch: searchSchema,
  component: NewRequestPage,
  head: () => ({ meta: [{ title: "Request a service — Eain Pro" }] }),
});

const STEPS = [
  { en: "Service", my: "ဝန်ဆောင်မှု" },
  { en: "Details", my: "အသေးစိတ်" },
  { en: "Location", my: "တည်နေရာ" },
  { en: "Photos", my: "ဓာတ်ပုံ" },
  { en: "Timing", my: "အချိန်" },
  { en: "Review", my: "ပြန်ကြည့်" },
];

function NewRequestPage() {
  const search = Route.useSearch();
  const cat = search.cat ?? search.category;
  const sub = search.sub;
  const initialCity = search.city;
  const { lang } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState({
    category: cat ?? "",
    subcategory: sub ?? "",
    description: "",
    answers: {} as Record<string, string>,
    urgency: "flexible" as "today" | "tomorrow" | "this_week" | "flexible",
    city: "yangon",
    township: "",
    area: "",
    address: "",
    photoUrls: [] as string[],
    uploading: false,
    timing: "this_week",
    window: "any" as "morning" | "afternoon" | "evening" | "any",
    customDate: "",
    contact: "in_app" as "in_app" | "phone" | "viber",
    contactPhone: "",
    budget: "any",
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const category = useMemo(
    () => CATEGORIES.find((c) => c.slug === form.category),
    [form.category],
  );
  const subs = CATEGORY_SUBCATEGORIES[form.category] ?? [];
  const questions = CATEGORY_QUESTIONS[form.category] ?? [];

  const canNext = () => {
    if (step === 1) return !!form.category;
    if (step === 2) return form.description.trim().length >= 5;
    if (step === 3) return !!form.city && !!form.township.trim();
    return true;
  };

  const next = () => setStep((s) => Math.min(STEPS.length, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !user) return;
    set("uploading", true);
    const urls: string[] = [];
    for (const f of files) {
      const ext = f.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("job-photos").upload(path, f, {
        cacheControl: "3600",
        upsert: false,
      });
      if (!error) {
        const { data } = supabase.storage.from("job-photos").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    setForm((f) => ({ ...f, photoUrls: [...f.photoUrls, ...urls], uploading: false }));
    e.target.value = "";
  };

  const submit = async () => {
    setErr(null);
    if (!user) {
      nav({ to: "/signin", search: { redirect: "/request/new" } });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase
      .from("job_requests")
      .insert({
        customer_id: user.id,
        category_slug: form.category,
        subcategory_slug: form.subcategory || null,
        description: form.description,
        category_answers: form.answers,
        city_slug: form.city,
        area: form.area || null,
        address: form.address || null,
        photo_urls: form.photoUrls,
        urgency: form.urgency,
        preferred_date: form.customDate || null,
        preferred_window: form.window,
        budget_range: form.budget,
        preferred_contact: form.contact,
        contact_phone: form.contactPhone || null,
      })
      .select("id")
      .single();
    setSubmitting(false);
    if (error) {
      setErr(error.message);
      return;
    }
    nav({ to: "/request/$jobId", params: { jobId: data.id }, search: { tab: "providers" } });
  };

  useEffect(() => {
    if (!authLoading && !user) {
      // Allow viewing the form unauthenticated; gate on submit.
    }
  }, [authLoading, user]);

  const L = (en: string, my: string) => (lang === "en" ? en : my);

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-0">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-5 sm:px-6 sm:py-10">
        {/* Stepper */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-1">
            {STEPS.map((s, i) => {
              const n = i + 1;
              const active = n === step;
              const done = n < step;
              return (
                <div key={s.en} className="flex flex-1 items-center gap-1">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                      done
                        ? "bg-primary text-primary-foreground"
                        : active
                          ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : n}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 ${
                        n < step ? "bg-primary" : "bg-border"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {L(`Step ${step} of ${STEPS.length}`, `အဆင့် ${step} / ${STEPS.length}`)} ·{" "}
            <span className="text-foreground">
              {L(STEPS[step - 1].en, STEPS[step - 1].my)}
            </span>
          </p>
        </div>

        {/* Step 1: Service */}
        {step === 1 && (
          <Section title={L("What service do you need?", "ဘယ်ဝန်ဆောင်မှု လိုသလဲ?")}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CATEGORIES.map((c) => (
                <button
                  key={c.slug}
                  onClick={() => {
                    set("category", c.slug);
                    set("subcategory", "");
                  }}
                  className={`rounded-2xl border p-3 text-left text-sm font-semibold transition ${
                    form.category === c.slug
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  {L(c.en, c.my)}
                </button>
              ))}
            </div>
            {form.category && subs.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold">
                  {L(
                    `What ${category?.en.toLowerCase()} help do you need?`,
                    "ဘယ်လို အကူအညီ လိုသလဲ?",
                  )}
                </h3>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {subs.map((s) => (
                    <button
                      key={s.slug}
                      onClick={() => set("subcategory", s.slug)}
                      className={`rounded-xl border p-3 text-left text-sm transition ${
                        form.subcategory === s.slug
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-primary/40"
                      }`}
                    >
                      {L(s.en, s.my)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Section>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <Section title={L("Tell us what you need help with", "လိုအပ်ချက် ပြောပြပါ")}>
            <Textarea
              rows={5}
              placeholder={L(
                "Example: Water is leaking under the kitchen sink. I need someone to check and repair it.",
                "ဥပမာ — မီးဖိုခန်း ဇလုံအောက်တွင် ရေယိုနေပါသည်။ စစ်ဆေး၍ ပြုပြင်ပေးပါ။",
              )}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {L(
                "Add as much detail as you can. This helps providers give better prices.",
                "ပိုပြောပြလေ စျေးကောင်းရလေ ဖြစ်ပါသည်။",
              )}
            </p>

            {questions.map((q) => (
              <div key={q.id} className="mt-5">
                <h4 className="mb-2 text-sm font-semibold">{L(q.en, q.my)}</h4>
                <div className="flex flex-wrap gap-2">
                  {q.options.map((opt) => {
                    const active = form.answers[q.id] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() =>
                          set("answers", { ...form.answers, [q.id]: opt.value })
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card hover:border-primary/40"
                        }`}
                      >
                        {L(opt.en, opt.my)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="mt-5">
              <h4 className="mb-2 text-sm font-semibold">
                {L("Is this urgent?", "အရေးပေါ်ပါသလား?")}
              </h4>
              <div className="flex flex-wrap gap-2">
                {URGENCY_OPTIONS.map((u) => (
                  <button
                    key={u.value}
                    onClick={() => set("urgency", u.value as typeof form.urgency)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      form.urgency === u.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    {L(u.en, u.my)}
                  </button>
                ))}
              </div>
            </div>
          </Section>
        )}

        {/* Step 3: Location */}
        {step === 3 && (
          <Section title={L("Where is the service needed?", "ဘယ်နေရာ လိုသလဲ?")}>
            <Label>{L("City", "မြို့")}</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {CITIES.map((c) => (
                <button
                  key={c.slug}
                  onClick={() => set("city", c.slug)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    form.city === c.slug
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  {L(c.en, c.my)}
                </button>
              ))}
            </div>

            <Label className="mt-4">{L("Township", "မြို့နယ်")}</Label>
            <Input
              placeholder={L("e.g. Bahan, Hlaing, Yankin", "ဥပမာ — ဗဟန်း")}
              value={form.township}
              onChange={(e) => set("township", e.target.value)}
            />

            <Label className="mt-4">{L("Area / locality (optional)", "ရပ်ကွက် (ရွေး)")}</Label>
            <Input
              placeholder={L("e.g. near Sule Pagoda", "ဥပမာ — ဆူးလေဘုရားအနီး")}
              value={form.area}
              onChange={(e) => set("area", e.target.value)}
            />

            <Label className="mt-4">{L("Address details (kept private)", "လိပ်စာ အသေးစိတ်")}</Label>
            <Input
              placeholder={L("Street, building, floor, unit", "လမ်း၊ အဆောက်အအုံ၊ အခန်း")}
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />

            <div className="mt-4 flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs text-foreground/80">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>
                {L(
                  "Your exact address is shared only after you confirm a provider.",
                  "လိပ်စာအတိအကျကို ဝန်ဆောင်မှုပေးသူ အတည်ပြုပြီးမှသာ ပြသပါမည်။",
                )}
              </p>
            </div>
          </Section>
        )}

        {/* Step 4: Photos */}
        {step === 4 && (
          <Section
            title={L("Add photos to get better quotes", "ပိုကောင်းသော စျေးနှုန်းအတွက် ဓာတ်ပုံ ထည့်ပါ")}
          >
            <p className="mb-3 text-sm text-muted-foreground">
              {L(
                "Photos help providers understand the work and give a more accurate price.",
                "ဓာတ်ပုံများက ဝန်ဆောင်မှုပေးသူများကို ပိုနားလည်စေပါသည်။",
              )}
            </p>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card p-8 transition hover:border-primary/50">
              <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
              <span className="text-sm font-semibold">
                {form.uploading
                  ? L("Uploading…", "တင်နေ…")
                  : L("Tap to upload photos", "ဓာတ်ပုံ တင်ရန် နှိပ်ပါ")}
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
                  <div key={u} className="relative aspect-square overflow-hidden rounded-xl border">
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

            <p className="mt-3 text-xs text-muted-foreground">
              {L("You can skip this step.", "ဤအဆင့်ကို ကျော်နိုင်ပါသည်။")}
            </p>
          </Section>
        )}

        {/* Step 5: Timing + contact + budget */}
        {step === 5 && (
          <Section title={L("When do you need this?", "ဘယ်အချိန် လိုသလဲ?")}>
            <div className="flex flex-wrap gap-2">
              {TIMING_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => set("timing", t.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    form.timing === t.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  {L(t.en, t.my)}
                </button>
              ))}
            </div>

            <Label className="mt-4">{L("Or choose a date", "သို့မဟုတ် ရက်ရွေးပါ")}</Label>
            <Input
              type="date"
              value={form.customDate}
              onChange={(e) => set("customDate", e.target.value)}
            />

            <Label className="mt-4">{L("Preferred time", "နှစ်သက်သော အချိန်")}</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {WINDOW_OPTIONS.map((w) => (
                <button
                  key={w.value}
                  onClick={() => set("window", w.value as typeof form.window)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    form.window === w.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  {L(w.en, w.my)}
                </button>
              ))}
            </div>

            <Label className="mt-5">
              {L("How should providers contact you?", "ဝန်ဆောင်မှုပေးသူများ ဘယ်လို ဆက်သွယ်ရမည်?")}
            </Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {CONTACT_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => set("contact", c.value as typeof form.contact)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    form.contact === c.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  {L(c.en, c.my)}
                </button>
              ))}
            </div>
            {form.contact !== "in_app" && (
              <Input
                className="mt-2"
                placeholder={L("Your phone number", "ဖုန်းနံပါတ်")}
                value={form.contactPhone}
                onChange={(e) => set("contactPhone", e.target.value)}
              />
            )}
            <p className="mt-1 text-[11px] text-muted-foreground">
              {L(
                "Your phone is shared only after you confirm a booking.",
                "ဖုန်းနံပါတ်ကို booking အတည်ပြုပြီးမှသာ ပြသပါမည်။",
              )}
            </p>

            <Label className="mt-5">{L("Budget (optional)", "ဘတ်ဂျက် (ရွေး)")}</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {BUDGET_OPTIONS.map((b) => (
                <button
                  key={b.value}
                  onClick={() => set("budget", b.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    form.budget === b.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  {L(b.en, b.my)}
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* Step 6: Review */}
        {step === 6 && (
          <Section title={L("Review your request", "သင်၏ တောင်းဆိုချက်ကို ပြန်ကြည့်ပါ")}>
            <div className="space-y-3 rounded-2xl border border-border bg-card p-4 text-sm">
              <Row
                label={L("Service", "ဝန်ဆောင်မှု")}
                value={
                  category
                    ? `${lang === "en" ? category.en : category.my}${
                        form.subcategory
                          ? ` · ${subs.find((s) => s.slug === form.subcategory)?.[lang === "en" ? "en" : "my"] ?? ""}`
                          : ""
                      }`
                    : "—"
                }
              />
              <Row
                label={L("Description", "ဖော်ပြချက်")}
                value={form.description}
                multiline
              />
              <Row
                label={L("Location", "တည်နေရာ")}
                value={`${CITIES.find((c) => c.slug === form.city)?.[lang === "en" ? "en" : "my"] ?? form.city}, ${form.township}${form.area ? ` · ${form.area}` : ""}`}
              />
              <Row
                label={L("Photos", "ဓာတ်ပုံ")}
                value={
                  form.photoUrls.length
                    ? L(`${form.photoUrls.length} attached`, `${form.photoUrls.length} ခု`)
                    : L("None", "မရှိ")
                }
              />
              <Row
                label={L("Urgency", "အရေးပေါ်")}
                value={
                  URGENCY_OPTIONS.find((u) => u.value === form.urgency)?.[
                    lang === "en" ? "en" : "my"
                  ] ?? form.urgency
                }
              />
              <Row
                label={L("When", "ဘယ်အချိန်")}
                value={`${TIMING_OPTIONS.find((t) => t.value === form.timing)?.[lang === "en" ? "en" : "my"] ?? form.timing} · ${WINDOW_OPTIONS.find((w) => w.value === form.window)?.[lang === "en" ? "en" : "my"] ?? form.window}`}
              />
              <Row
                label={L("Budget", "ဘတ်ဂျက်")}
                value={
                  BUDGET_OPTIONS.find((b) => b.value === form.budget)?.[
                    lang === "en" ? "en" : "my"
                  ] ?? "—"
                }
              />
            </div>
            {err && (
              <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                {err}
              </p>
            )}
          </Section>
        )}
      </main>

      {/* Sticky footer nav */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:static md:border-0 md:bg-transparent md:px-0 md:py-6"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 sm:px-6">
          {step > 1 ? (
            <Button variant="outline" onClick={back} className="rounded-xl">
              <ArrowLeft className="mr-1 h-4 w-4" />
              {L("Back", "နောက်")}
            </Button>
          ) : (
            <span />
          )}
          {step < STEPS.length ? (
            <Button
              onClick={next}
              disabled={!canNext()}
              className="rounded-xl font-semibold"
            >
              {L("Continue", "ဆက်လုပ်")}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={submit}
              disabled={submitting}
              className="rounded-xl font-semibold shadow-lg shadow-primary/25"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  {L("Sending…", "ပေးပို့နေ…")}
                </>
              ) : (
                L("Find Providers", "ဝန်ဆောင်မှုပေးသူ ရှာရန်")
              )}
            </Button>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Label({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-xs font-semibold text-muted-foreground ${className}`}>
      {children}
    </label>
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