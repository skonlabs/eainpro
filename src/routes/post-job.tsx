import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { CATEGORIES, CITIES } from "@/lib/catalog";
import { useState } from "react";

const searchSchema = z.object({
  q: z.string().optional(),
  city: z.string().optional(),
});

export const Route = createFileRoute("/post-job")({
  validateSearch: searchSchema,
  component: PostJobPage,
  head: () => ({ meta: [{ title: "Post a job — Eain Pro" }] }),
});

function PostJobPage() {
  const { q, city } = Route.useSearch();
  const { t, lang } = useI18n();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    category: q ?? "",
    description: "",
    city: city ?? "yangon",
    township: "",
    urgency: "this_week" as "today" | "tomorrow" | "this_week" | "flexible",
    contact: "in_app" as "in_app" | "phone" | "viber",
  });

  const next = () => setStep((s) => Math.min(4, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="flex flex-1 items-center gap-2">
              <div
                className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${
                  step >= n ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground/60"
                }`}
              >
                {n}
              </div>
              {n < 4 && <div className={`h-px flex-1 ${step > n ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <h1 className="text-2xl font-bold tracking-tight">{t("nav_post")}</h1>

        <div className="mt-6 space-y-4 rounded-xl border border-border bg-card p-5">
          {step === 1 && (
            <div className="space-y-3">
              <label className="text-sm font-medium">
                {lang === "en" ? "Service category" : "ဝန်ဆောင်မှု အမျိုးအစား"}
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">—</option>
                {CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {lang === "en" ? c.en : c.my}
                  </option>
                ))}
              </select>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <label className="text-sm font-medium">
                {lang === "en" ? "Describe what you need" : "လိုအပ်ချက်ကို ဖော်ပြပါ"}
              </label>
              <Textarea
                rows={5}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={
                  lang === "en"
                    ? "e.g. 1 split aircon needs deep cleaning, 5th floor."
                    : "ဥပမာ - အဲကွန်း ၁ လုံး အပြည့်အဝ သန့်ရှင်းရေး လိုအပ်ပါသည်။"
                }
              />
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">{t("city")}</label>
                <select
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {CITIES.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {lang === "en" ? c.en : c.my}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">
                  {lang === "en" ? "Township" : "မြို့နယ်"}
                </label>
                <Input
                  value={form.township}
                  onChange={(e) => setForm({ ...form, township: e.target.value })}
                  className="mt-1 h-11"
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">
                  {lang === "en" ? "Urgency" : "အရေးပေါ်"}
                </label>
                <select
                  value={form.urgency}
                  onChange={(e) =>
                    setForm({ ...form, urgency: e.target.value as typeof form.urgency })
                  }
                  className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="today">{lang === "en" ? "Today" : "ယနေ့"}</option>
                  <option value="tomorrow">{lang === "en" ? "Tomorrow" : "မနက်ဖြန်"}</option>
                  <option value="this_week">{lang === "en" ? "This week" : "ဤအပတ်"}</option>
                  <option value="flexible">{lang === "en" ? "Flexible" : "လွတ်လပ်"}</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">
                  {lang === "en" ? "Preferred contact" : "ဆက်သွယ်လိုသည့်နည်း"}
                </label>
                <select
                  value={form.contact}
                  onChange={(e) =>
                    setForm({ ...form, contact: e.target.value as typeof form.contact })
                  }
                  className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="in_app">{lang === "en" ? "In-app chat" : "အက်ပ်အတွင်း စကားပြော"}</option>
                  <option value="phone">{lang === "en" ? "Phone" : "ဖုန်း"}</option>
                  <option value="viber">Viber</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" onClick={back} disabled={step === 1}>
              {lang === "en" ? "Back" : "နောက်သို့"}
            </Button>
            {step < 4 ? (
              <Button onClick={next}>{lang === "en" ? "Next" : "ဆက်လုပ်ရန်"}</Button>
            ) : (
              <Button
                onClick={() =>
                  alert(
                    lang === "en"
                      ? "Job request ready. Sign in to submit — full backend wiring lands in Phase 2."
                      : "အလုပ်တောင်းခံချက် ပြင်ဆင်ပြီးပါပြီ။ Phase 2 တွင် အပြည့်အဝ ဆက်သွယ်ပေးပါမည်။",
                  )
                }
              >
                {lang === "en" ? "Submit" : "တင်ပြရန်"}
              </Button>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}