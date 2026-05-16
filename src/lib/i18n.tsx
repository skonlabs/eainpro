import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "my";

type Dict = Record<string, { en: string; my: string }>;

export const T: Dict = {
  brand: { en: "Eain Pro", my: "အိမ်ပရို" },
  tagline: {
    en: "Trusted home services for every Myanmar home.",
    my: "မြန်မာအိမ်တိုင်းအတွက် ယုံကြည်စိတ်ချရသော အိမ်တွင်းဝန်ဆောင်မှုများ။",
  },
  hero_title: {
    en: "Book trusted home services in Myanmar.",
    my: "မြန်မာနိုင်ငံတွင် ယုံကြည်စိတ်ချရသော အိမ်တွင်းဝန်ဆောင်မှုများကို ဘွတ်ကင်လုပ်ပါ။",
  },
  hero_sub: {
    en: "Find reliable cleaners, plumbers, electricians, AC technicians, painters, movers, and more — all in one place.",
    my: "သန့်ရှင်းရေး၊ ပိုက်ဆက်၊ လျှပ်စစ်၊ အဲကွန်း၊ ဆေးသုတ်၊ ပစ္စည်းသယ်ဆောင်ရေး အစရှိသည်တို့ကို တစ်နေရာတည်းတွင် ရှာတွေ့နိုင်ပါသည်။",
  },
  cta_find: { en: "Find a Service", my: "ဝန်ဆောင်မှု ရှာရန်" },
  cta_join: { en: "Join as Provider", my: "ဝန်ဆောင်မှုပေးသူ အဖြစ်စာရင်းသွင်းရန်" },
  search_placeholder: { en: "What service do you need?", my: "ဘယ်ဝန်ဆောင်မှု လိုအပ်ပါသလဲ?" },
  city: { en: "City / Township", my: "မြို့ / မြို့နယ်" },
  popular: { en: "Popular", my: "လူကြိုက်များသော" },
  trust_verified: { en: "Verified providers", my: "အတည်ပြုထားသူများ" },
  trust_pricing: { en: "Clear pricing", my: "ပွင့်လင်းသော စျေးနှုန်း" },
  trust_chat: { en: "Chat before booking", my: "ဘွတ်ကင်မလုပ်ခင် စကားပြောနိုင်" },
  trust_reviews: { en: "Customer reviews", my: "ဖောက်သည် သုံးသပ်ချက်များ" },
  trust_support: { en: "Myanmar support", my: "မြန်မာဘာသာ အကူအညီ" },
  categories: { en: "Service categories", my: "ဝန်ဆောင်မှု အမျိုးအစားများ" },
  how_it_works: { en: "How it works", my: "လုပ်ဆောင်ပုံ" },
  step1: { en: "Choose a service", my: "ဝန်ဆောင်မှု ရွေးပါ" },
  step2: { en: "Tell us what you need", my: "လိုအပ်ချက် ပြောပြပါ" },
  step3: { en: "Compare providers", my: "ဝန်ဆောင်မှုပေးသူများ နှိုင်းယှဉ်" },
  step4: { en: "Book and pay", my: "ဘွတ်ကင်လုပ်ပြီး ပေးချေပါ" },
  nav_services: { en: "Services", my: "ဝန်ဆောင်မှုများ" },
  nav_providers: { en: "Providers", my: "ဝန်ဆောင်မှုပေးသူများ" },
  nav_signin: { en: "Sign in", my: "ဝင်ရောက်" },
  nav_post: { en: "Post a job", my: "အလုပ်တင်ရန်" },
  footer_rights: { en: "All rights reserved.", my: "မူပိုင်ခွင့်အားလုံး လက်ဝယ်ရှိသည်။" },
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: keyof typeof T) => string };
const LangCtx = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("lang")) as Lang | null;
    if (saved === "en" || saved === "my") setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("lang", l);
  };

  const t = (k: keyof typeof T) => T[k][lang];
  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>;
}

export function useI18n() {
  const ctx = useContext(LangCtx);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}