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

// Townships grouped by city slug. Covers the main townships customers
// typically book services in. "Other" lets users proceed when their
// township isn't listed.
export const TOWNSHIPS: Record<string, { slug: string; en: string; my: string }[]> = {
  yangon: [
    { slug: "ahlone", en: "Ahlone", my: "အလုံ" },
    { slug: "bahan", en: "Bahan", my: "ဗဟန်း" },
    { slug: "botataung", en: "Botataung", my: "ဗိုလ်တထောင်" },
    { slug: "dagon", en: "Dagon", my: "ဒဂုံ" },
    { slug: "dagon-seikkan", en: "Dagon Seikkan", my: "ဒဂုံဆိပ်ကမ်း" },
    { slug: "dawbon", en: "Dawbon", my: "ဒေါပုံ" },
    { slug: "east-dagon", en: "East Dagon", my: "ဒဂုံအရှေ့" },
    { slug: "hlaing", en: "Hlaing", my: "လှိုင်" },
    { slug: "hlaingthaya", en: "Hlaingthaya", my: "လှိုင်သာယာ" },
    { slug: "insein", en: "Insein", my: "အင်းစိန်" },
    { slug: "kamayut", en: "Kamayut", my: "ကမာရွတ်" },
    { slug: "kyauktada", en: "Kyauktada", my: "ကျောက်တံတား" },
    { slug: "kyimyindaing", en: "Kyimyindaing", my: "ကြည့်မြင်တိုင်" },
    { slug: "lanmadaw", en: "Lanmadaw", my: "လမ်းမတော်" },
    { slug: "latha", en: "Latha", my: "လသာ" },
    { slug: "mayangone", en: "Mayangone", my: "မရမ်းကုန်း" },
    { slug: "mingala-taungnyunt", en: "Mingala Taungnyunt", my: "မင်္ဂလာတောင်ညွန့်" },
    { slug: "mingalardon", en: "Mingaladon", my: "မင်္ဂလာဒုံ" },
    { slug: "north-dagon", en: "North Dagon", my: "ဒဂုံမြောက်" },
    { slug: "north-okkalapa", en: "North Okkalapa", my: "မြောက်ဥက္ကလာပ" },
    { slug: "pabedan", en: "Pabedan", my: "ပန်းဘဲတန်း" },
    { slug: "pazundaung", en: "Pazundaung", my: "ပုဇွန်တောင်" },
    { slug: "sanchaung", en: "Sanchaung", my: "စမ်းချောင်း" },
    { slug: "seikkan", en: "Seikkan", my: "ဆိပ်ကမ်း" },
    { slug: "shwepyithar", en: "Shwepyithar", my: "ရွှေပြည်သာ" },
    { slug: "south-dagon", en: "South Dagon", my: "ဒဂုံတောင်" },
    { slug: "south-okkalapa", en: "South Okkalapa", my: "တောင်ဥက္ကလာပ" },
    { slug: "tamwe", en: "Tamwe", my: "တာမွေ" },
    { slug: "thaketa", en: "Thaketa", my: "သာကေတ" },
    { slug: "thingangyun", en: "Thingangyun", my: "သင်္ဃန်းကျွန်း" },
    { slug: "thaketa-2", en: "Thanlyin", my: "သန်လျင်" },
    { slug: "yankin", en: "Yankin", my: "ရန်ကင်း" },
  ],
  mandalay: [
    { slug: "aungmyethazan", en: "Aungmyethazan", my: "အောင်မြေသာစံ" },
    { slug: "chanayethazan", en: "Chanayethazan", my: "ချမ်းအေးသာစံ" },
    { slug: "chanmyathazi", en: "Chanmyathazi", my: "ချမ်းမြသာစည်" },
    { slug: "mahaaungmye", en: "Mahaaungmye", my: "မဟာအောင်မြေ" },
    { slug: "pyigyitagon", en: "Pyigyitagon", my: "ပြည်ကြီးတံခွန်" },
    { slug: "amarapura", en: "Amarapura", my: "အမရပူရ" },
    { slug: "patheingyi", en: "Patheingyi", my: "ပုသိမ်ကြီး" },
  ],
  naypyidaw: [
    { slug: "zabuthiri", en: "Zabuthiri", my: "ဇမ္ဗူသီရိ" },
    { slug: "zeyathiri", en: "Zeyathiri", my: "ဇေယျာသီရိ" },
    { slug: "pobbathiri", en: "Pobbathiri", my: "ပုဗ္ဗသီရိ" },
    { slug: "ottarathiri", en: "Ottarathiri", my: "ဥတ္တရသီရိ" },
    { slug: "dekkhinathiri", en: "Dekkhinathiri", my: "ဒက္ခိဏသီရိ" },
    { slug: "pyinmana", en: "Pyinmana", my: "ပျဉ်းမနား" },
    { slug: "lewe", en: "Lewe", my: "လယ်ဝေး" },
    { slug: "tatkon", en: "Tatkon", my: "တပ်ကုန်း" },
  ],
  bago: [
    { slug: "bago-town", en: "Bago", my: "ပဲခူး" },
    { slug: "taungoo", en: "Taungoo", my: "တောင်ငူ" },
    { slug: "pyay", en: "Pyay", my: "ပြည်" },
  ],
  mawlamyine: [
    { slug: "mawlamyine-town", en: "Mawlamyine", my: "မော်လမြိုင်" },
    { slug: "mudon", en: "Mudon", my: "မုဒုံ" },
    { slug: "thanbyuzayat", en: "Thanbyuzayat", my: "သံဖြူဇရပ်" },
  ],
  taunggyi: [
    { slug: "taunggyi-town", en: "Taunggyi", my: "တောင်ကြီး" },
    { slug: "shwenyaung", en: "Shwenyaung", my: "ရွှေညောင်" },
    { slug: "kalaw", en: "Kalaw", my: "ကလော" },
  ],
  pathein: [
    { slug: "pathein-town", en: "Pathein", my: "ပုသိမ်" },
    { slug: "chaungtha", en: "Chaungtha", my: "ချောင်းသာ" },
    { slug: "ngwesaung", en: "Ngwesaung", my: "ငွေဆောင်" },
  ],
  monywa: [
    { slug: "monywa-town", en: "Monywa", my: "မုံရွာ" },
    { slug: "budalin", en: "Budalin", my: "ဘုတလင်" },
    { slug: "salingyi", en: "Salingyi", my: "ဆားလင်းကြီး" },
  ],
};

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
