import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/guided")({
  component: GuidedPage,
  head: () => ({ meta: [{ title: "Help me choose — Fixido" }] }),
});

type Step = {
  q: { en: string; my: string };
  options: { en: string; my: string; next?: string; cat?: string; sub?: string }[];
};

const TREE: Record<string, Step> = {
  start: {
    q: { en: "What kind of problem do you have?", my: "ဘယ်လို ပြဿနာရှိသလဲ?" },
    options: [
      { en: "Water / pipe issue", my: "ရေ / ပိုက် ပြဿနာ", cat: "home-repair", sub: "plumbing" },
      { en: "Electrical issue", my: "လျှပ်စစ် ပြဿနာ", cat: "home-repair", sub: "electrical" },
      { en: "Aircon issue", my: "အဲကွန်း ပြဿနာ", cat: "aircon-utilities" },
      { en: "Cleaning needed", my: "သန့်ရှင်းရေး လို", cat: "cleaning" },
      { en: "Something needs fixing", my: "ပြုပြင်စရာ ရှိ", next: "fix" },
      { en: "Moving / heavy lifting", my: "ပစ္စည်းသယ်", cat: "moving" },
    ],
  },
  fix: {
    q: { en: "What needs fixing?", my: "ဘာ ပြုပြင်ရမှာလဲ?" },
    options: [
      { en: "Appliance (fridge, washer)", my: "အိမ်သုံးပစ္စည်း", cat: "home-repair", sub: "appliance" },
      { en: "Furniture / wooden work", my: "ပရိဘောဂ", cat: "installation", sub: "furniture_assembly" },
      { en: "Door / lock", my: "တံခါး / သော့", cat: "home-repair", sub: "door_lock" },
      { en: "Pest problem", my: "ပိုး", cat: "pest-control" },
      { en: "Other handyman work", my: "အခြား", cat: "home-repair", sub: "handyman" },
    ],
  },
};

function GuidedPage() {
  const { lang } = useI18n();
  const nav = useNavigate();
  const [stack, setStack] = useState<string[]>(["start"]);
  const current = TREE[stack[stack.length - 1]];
  const L = (en: string, my: string) => (lang === "en" ? en : my);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">

      <main className="mx-auto max-w-xl px-4 py-6 sm:px-6 sm:py-12">
        {stack.length > 1 && (
          <button
            onClick={() => setStack((s) => s.slice(0, -1))}
            className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {L("Back", "နောက်")}
          </button>
        )}
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {L(current.q.en, current.q.my)}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {L(
            "Pick what's closest. We'll match the right service.",
            "အနီးစပ်ဆုံးကို ရွေးပါ။",
          )}
        </p>
        <div className="mt-5 grid gap-2">
          {current.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => {
                if (opt.cat) nav({ to: "/request/new", search: { cat: opt.cat, sub: opt.sub } });
                else if (opt.next) setStack((s) => [...s, opt.next!]);
              }}
              className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 text-left text-sm font-semibold transition hover:border-primary hover:bg-primary/5"
            >
              <span>{L(opt.en, opt.my)}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Button
            variant="ghost"
            onClick={() => nav({ to: "/request/new", search: { cat: undefined, sub: undefined } })}
            className="text-xs"
          >
            {L("Skip and choose myself", "ကိုယ်တိုင် ရွေးမည်")}
          </Button>
        </div>
      </main>

    </div>
  );
}