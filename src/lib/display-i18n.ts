import { CATEGORIES, CITIES, TOWNSHIPS, WINDOW_OPTIONS, URGENCY_OPTIONS } from "@/lib/catalog";

export type DisplayLang = "en" | "my";

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function serviceLabel(value: string | null | undefined, lang: DisplayLang) {
  if (!value) return "";
  if (lang === "en") return value;
  const needle = value.trim().toLowerCase();
  for (const category of CATEGORIES) {
    if (category.slug === needle || category.en.toLowerCase() === needle) return category.my;
    for (const sub of category.subcategories ?? []) {
      if (sub.slug === needle || sub.en.toLowerCase() === needle) return sub.my;
    }
  }
  return value;
}

export function cityLabel(value: string | null | undefined, lang: DisplayLang) {
  if (!value) return "";
  const city = CITIES.find((item) => item.slug === value || item.en.toLowerCase() === value.toLowerCase());
  return city ? (lang === "en" ? city.en : city.my) : value;
}

export function townshipLabel(citySlug: string | null | undefined, township: string | null | undefined, lang: DisplayLang) {
  if (!township) return "";
  const row = citySlug ? (TOWNSHIPS[citySlug] ?? []).find((item) => item.slug === township || item.en === township || item.my === township) : null;
  return row ? (lang === "en" ? row.en : row.my) : township;
}

export function urgencyLabel(value: string | null | undefined, lang: DisplayLang) {
  if (!value) return "";
  const row = URGENCY_OPTIONS.find((item) => item.value === value);
  return row ? (lang === "en" ? row.en : row.my) : value;
}

export function windowLabel(value: string | null | undefined, lang: DisplayLang) {
  if (!value) return "";
  const row = WINDOW_OPTIONS.find((item) => item.value === value);
  return row ? (lang === "en" ? row.en : row.my) : value;
}

export function translateLeadText(text: string | null | undefined, lang: DisplayLang) {
  if (!text) return "";
  if (lang === "en") return text;

  let next = text.replace(/^Services:\s*/i, "ဝန်ဆောင်မှုများ: ");
  const pairs = [
    ...CATEGORIES.map((item) => [item.en, item.my] as const),
    ...CATEGORIES.flatMap((item) => (item.subcategories ?? []).map((sub) => [sub.en, sub.my] as const)),
    ...CITIES.flatMap((item) => [[item.slug, item.my] as const, [item.en, item.my] as const]),
  ].sort((a, b) => b[0].length - a[0].length);

  for (const [en, my] of pairs) {
    next = next.replace(new RegExp(escapeRegex(en), "gi"), my);
  }

  return next;
}