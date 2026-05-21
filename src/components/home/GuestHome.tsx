import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORIES } from "@/lib/catalog";
import { CheckCircle2, Clock, Hammer, Search, Shield } from "lucide-react";
import { ICONS, type Lang, type Lfn } from "./atoms";

export function GuestHome({ lang, L }: { lang: Lang; L: Lfn }) {
  const [q, setQ] = useState("");

  const filteredCats = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle) {
      return CATEGORIES.filter(
        (c) => c.en.toLowerCase().includes(needle) || c.my.includes(q.trim()) || c.slug.includes(needle),
      ).slice(0, 12);
    }
    return CATEGORIES.slice(0, 8);
  }, [q]);

  return (
    <div className="space-y-6">
      <div
        className="relative overflow-hidden rounded-3xl p-6 text-primary-foreground shadow-xl shadow-primary/25"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-[color:var(--accent)]/30 blur-3xl" />
        <div className="relative">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            {L("Trusted home services in Myanmar", "ယုံကြည်စိတ်ချရသော နေအိမ်ဝန်ဆောင်မှုများ")}
          </h1>
          <p className="mt-2 max-w-sm text-sm text-primary-foreground/85">
            {L(
              "Book verified cleaners, plumbers, electricians, AC technicians and more in minutes.",
              "မိနစ်အနည်းငယ်အတွင်း အတည်ပြုပြီးသော သန့်ရှင်းရေး၊ ပိုက်အင်ဂျင်နီယာ၊ အီလက်ထရစ်နှင့် အခြား ဝန်ဆောင်မှုများကို ဘွတ်ကင်လုပ်ပါ။",
            )}
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link to="/signup">
              <Button className="h-11 w-full rounded-xl bg-white text-foreground font-semibold shadow-md hover:bg-white/90 sm:w-auto">
                {L("Get started — it's free", "အခမဲ့ စတင်ပါ")}
              </Button>
            </Link>
            <Link to="/signin">
              <Button
                variant="outline"
                className="h-11 w-full rounded-xl border-white/40 bg-white/10 font-semibold text-primary-foreground hover:bg-white/20 sm:w-auto"
              >
                {L("Sign in", "ဝင်ရောက်")}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={L("What needs fixing? e.g. aircon, leak…", "ဘာဖြစ်နေသလဲ? ဥပမာ - အဲကွန်း, ပိုက်")}
            className="h-12 rounded-2xl border-border bg-card pl-10 pr-4 text-sm shadow-soft"
          />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {filteredCats.map((c) => {
            const Icon = ICONS[c.icon] ?? Hammer;
            return (
              <Link
                key={c.slug}
                to="/request/new"
                search={{ cat: c.slug }}
                className="group flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-3 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-soft"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-center text-[11px] font-semibold leading-tight">
                  {lang === "en" ? c.en : c.my}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-bold tracking-tight">
          {L("Why Fixido?", "Fixido ဘာလို့သုံးသင့်သလဲ?")}
        </h2>
        <ul className="mt-3 space-y-3">
          <li className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <div className="text-sm font-semibold">
                {L("Verified providers", "အတည်ပြုပြီးသော ဝန်ဆောင်သူများ")}
              </div>
              <div className="text-xs text-muted-foreground">
                {L("Every pro is background-checked before joining.", "ဝင်ခွင့်ရောင်း မရမီ အနောက်ခံ စစ်ဆေးထားပါသည်။")}
              </div>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Clock className="h-5 w-5" />
            </span>
            <div>
              <div className="text-sm font-semibold">
                {L("Fast matching", "အမြန်ပွဲစား")}
              </div>
              <div className="text-xs text-muted-foreground">
                {L("Post a request and get quotes within hours.", "တောင်းဆိုမှုတစ်ခုပို့ပြီး နာရီအနည်းငယ်အတွင်း စျေးနှုန်းများ ရယူပါ။")}
              </div>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Shield className="h-5 w-5" />
            </span>
            <div>
              <div className="text-sm font-semibold">
                {L("Transparent pricing", "ပွင့်လင်းသော စျေးနှုန်း")}
              </div>
              <div className="text-xs text-muted-foreground">
                {L("Compare quotes and choose what fits your budget.", "စျေးနှုန်းများကို နှိုင်းယှဉ်ပြီး သင့်ဘတ်ဂျက်နှင့် လိုက်ဖက်ရာ ရွေးပါ။")}
              </div>
            </div>
          </li>
        </ul>
      </section>

      <div className="rounded-2xl border border-border bg-card/60 p-5 text-center">
        <p className="text-sm font-semibold text-foreground">
          {L("Ready to get things fixed?", "ပြင်ဆင်ချင်ပြီလား?")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {L("Join thousands of homeowners already using Fixido.", "Fixido ကို သုံးနေသည့် အိမ်ရှင်ထောင်ချီ ပူးပေါင်းပါ။")}
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link to="/signup">
            <Button className="h-11 w-full rounded-xl font-semibold sm:w-auto">
              {L("Create free account", "အခမဲ့ အကောင့်ဖွင့်ရန်")}
            </Button>
          </Link>
          <Link to="/services">
            <Button variant="outline" className="h-11 w-full rounded-xl font-semibold sm:w-auto">
              {L("Browse services", "ဝန်ဆောင်မှုများ ကြည့်ရှုရန်")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}