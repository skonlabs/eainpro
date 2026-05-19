export type Category = {
  slug: string;
  en: string;
  my: string;
  icon: string; // lucide name
  subcategories?: { slug: string; en: string; my: string }[];
};

export const CATEGORIES: Category[] = [
  {
    slug: "home-repair",
    en: "Home Repair",
    my: "အိမ်ပြုပြင်",
    icon: "Wrench",
    subcategories: [
      { slug: "plumbing", en: "Plumbing", my: "ပိုက်ဆက်" },
      { slug: "electrical", en: "Electrical", my: "လျှပ်စစ်" },
      { slug: "handyman", en: "Handyman", my: "ထောက်ပံ့သမား" },
      { slug: "appliance", en: "Appliance Repair", my: "အိမ်သုံးပစ္စည်း ပြုပြင်" },
      { slug: "door_lock", en: "Door / Lock Repair", my: "တံခါး/သော့ ပြုပြင်" },
    ],
  },
  {
    slug: "aircon-utilities",
    en: "Aircon & Utilities",
    my: "အဲကွန်း နှင့် ဝန်ဆောင်မှု",
    icon: "Snowflake",
    subcategories: [
      { slug: "aircon_cleaning", en: "Aircon Cleaning", my: "အဲကွန်း သန့်ရှင်းရေး" },
      { slug: "aircon_repair", en: "Aircon Repair", my: "အဲကွန်း ပြုပြင်" },
      { slug: "aircon_install", en: "Aircon Installation", my: "အဲကွန်း တပ်ဆင်" },
      { slug: "water_pump", en: "Water Pump", my: "ရေပန့်" },
      { slug: "water_tank_cleaning", en: "Water Tank Cleaning", my: "ရေတိုင်ကီ သန့်ရှင်းရေး" },
    ],
  },
  {
    slug: "cleaning",
    en: "Cleaning",
    my: "သန့်ရှင်းရေး",
    icon: "Sparkles",
    subcategories: [
      { slug: "home", en: "Home Cleaning", my: "အိမ်သန့်ရှင်းရေး" },
      { slug: "deep", en: "Deep Cleaning", my: "အပြည့်အဝ သန့်ရှင်းရေး" },
      { slug: "bathroom", en: "Bathroom Cleaning", my: "ရေချိုးခန်း သန့်ရှင်းရေး" },
      { slug: "kitchen", en: "Kitchen Cleaning", my: "မီးဖိုချောင် သန့်ရှင်းရေး" },
      { slug: "sofa_mattress", en: "Sofa / Mattress Cleaning", my: "ဆိုဖာ/မွေ့ယာ သန့်ရှင်းရေး" },
      { slug: "post_construction", en: "Post-Construction Cleaning", my: "ဆောက်လုပ်ပြီး သန့်ရှင်းရေး" },
    ],
  },
  {
    slug: "pest-control",
    en: "Pest Control",
    my: "ပိုးသတ်",
    icon: "Bug",
    subcategories: [
      { slug: "cockroach", en: "Cockroach", my: "ပိုးဟပ်" },
      { slug: "ant", en: "Ant", my: "ပုရွက်ဆိတ်" },
      { slug: "termite", en: "Termite", my: "ခြ" },
      { slug: "mosquito", en: "Mosquito", my: "ခြင်" },
      { slug: "rat", en: "Rat", my: "ကြွက်" },
      { slug: "general", en: "General Pest Package", my: "ပိုးသတ် အထွေထွေ" },
    ],
  },
  {
    slug: "moving",
    en: "Moving",
    my: "ပစ္စည်းသယ်",
    icon: "Truck",
    subcategories: [
      { slug: "house", en: "House Moving", my: "အိမ်ပြောင်း" },
      { slug: "small_item", en: "Small Item Moving", my: "ပစ္စည်းအနည်းငယ်" },
      { slug: "office", en: "Office Moving", my: "ရုံးပြောင်း" },
      { slug: "packing", en: "Packing Help", my: "ထုပ်ပိုးကူညီ" },
      { slug: "truck_labor", en: "Truck + Labor", my: "ကား + လုပ်သား" },
    ],
  },
  {
    slug: "installation",
    en: "Installation",
    my: "တပ်ဆင်",
    icon: "Hammer",
    subcategories: [
      { slug: "tv_mounting", en: "TV Mounting", my: "တီဗီတပ်ဆင်" },
      { slug: "curtain", en: "Curtain Installation", my: "ကန့်လန့်ကာ တပ်ဆင်" },
      { slug: "furniture_assembly", en: "Furniture Assembly", my: "ပရိဘောဂ တပ်ဆင်" },
      { slug: "lighting", en: "Lighting Installation", my: "မီးတပ်ဆင်" },
      { slug: "cctv", en: "CCTV Installation", my: "CCTV တပ်ဆင်" },
    ],
  },
];

export const CITIES: { slug: string; en: string; my: string }[] = [
  { slug: "yangon", en: "Yangon", my: "ရန်ကုန်" },
  { slug: "mandalay", en: "Mandalay", my: "မန္တလေး" },
  { slug: "naypyidaw", en: "Naypyidaw", my: "နေပြည်တော်" },
  { slug: "bago", en: "Bago", my: "ပဲခူး" },
  { slug: "mawlamyine", en: "Mawlamyine", my: "မော်လမြိုင်" },
  { slug: "taunggyi", en: "Taunggyi", my: "တောင်ကြီး" },
  { slug: "pathein", en: "Pathein", my: "ပုသိမ်" },
  { slug: "monywa", en: "Monywa", my: "မုံရွာ" },
];

// --- Per-category guided questions ------------------------------------
export type QuestionOption = { value: string; en: string; my: string };
export type Question = {
  id: string;
  en: string;
  my: string;
  multi?: boolean;
  options: QuestionOption[];
};

export const CATEGORY_QUESTIONS: Record<string, Question[]> = {};

export const URGENCY_OPTIONS = [
  { value: "today", en: "Yes, I need help today", my: "ဒီနေ့ပဲ လိုသည်" },
  { value: "tomorrow", en: "Soon, within 1-2 days", my: "၁-၂ ရက်အတွင်း" },
  { value: "flexible", en: "Flexible", my: "ပြောင်းလဲနိုင်သည်" },
] as const;

export const TIMING_OPTIONS = [
  { value: "today", en: "Today", my: "ဒီနေ့" },
  { value: "tomorrow", en: "Tomorrow", my: "မနက်ဖြန်" },
  { value: "this_week", en: "This week", my: "ဒီအပတ်" },
  { value: "flexible", en: "Flexible", my: "ပြောင်းလဲနိုင်" },
] as const;

export const WINDOW_OPTIONS = [
  { value: "morning", en: "Morning", my: "မနက်" },
  { value: "afternoon", en: "Afternoon", my: "နေ့လည်" },
  { value: "evening", en: "Evening", my: "ညနေ" },
  { value: "any", en: "Any time", my: "မည်သည့်အချိန်" },
] as const;

export const CONTACT_OPTIONS = [
  { value: "in_app", en: "In-app chat", my: "အပ်ပလီ စကားပြော" },
  { value: "phone", en: "Phone call after booking", my: "ဖုန်းခေါ်ပါ" },
  { value: "viber", en: "Viber after booking", my: "Viber" },
] as const;

export const BUDGET_OPTIONS = [
  { value: "any", en: "No fixed budget", my: "မသတ်မှတ်" },
  { value: "u30k", en: "Under 30,000 MMK", my: "၃၀,၀၀၀ ကျပ်အောက်" },
  { value: "30_50k", en: "30,000 - 50,000 MMK", my: "၃၀,၀၀၀ - ၅၀,၀၀၀ ကျပ်" },
  { value: "50_100k", en: "50,000 - 100,000 MMK", my: "၅၀,၀၀၀ - ၁၀၀,၀၀၀ ကျပ်" },
  { value: "100k+", en: "100,000+ MMK", my: "၁၀၀,၀၀၀+ ကျပ်" },
] as const;

// Subcategory presets for the request flow — kept in sync with CATEGORIES above
// so the request page and the services pages show identical options.
export const CATEGORY_SUBCATEGORIES: Record<string, { slug: string; en: string; my: string }[]> =
  Object.fromEntries(CATEGORIES.filter((c) => c.subcategories).map((c) => [c.slug, c.subcategories!]));
