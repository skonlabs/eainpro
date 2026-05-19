export type Category = {
  slug: string;
  en: string;
  my: string;
  icon: string; // lucide name
  subcategories?: { slug: string; en: string; my: string }[];
};

export const CATEGORIES: Category[] = [
  {
    slug: "cleaning",
    en: "Cleaning",
    my: "သန့်ရှင်းရေး",
    icon: "Sparkles",
    subcategories: [
      { slug: "house", en: "House cleaning", my: "အိမ်သန့်ရှင်းရေး" },
      { slug: "deep", en: "Deep cleaning", my: "အပြည့်အဝ သန့်ရှင်းရေး" },
      { slug: "move", en: "Move-in / Move-out", my: "ပြောင်းရွှေ့ သန့်ရှင်းရေး" },
    ],
  },
  { slug: "plumbing", en: "Plumbing", my: "ပိုက်ဆက်", icon: "Wrench" },
  { slug: "electrical", en: "Electrical repair", my: "လျှပ်စစ်ပြုပြင်", icon: "Plug" },
  {
    slug: "aircon",
    en: "Aircon",
    my: "အဲကွန်း",
    icon: "Snowflake",
    subcategories: [
      { slug: "install", en: "Installation", my: "တပ်ဆင်ခြင်း" },
      { slug: "cleaning", en: "Cleaning", my: "သန့်ရှင်းခြင်း" },
      { slug: "repair", en: "Repair", my: "ပြုပြင်ခြင်း" },
    ],
  },
  { slug: "appliance", en: "Appliance repair", my: "အိမ်သုံးပစ္စည်း ပြုပြင်", icon: "Refrigerator" },
  { slug: "painting", en: "Painting", my: "ဆေးသုတ်", icon: "PaintBucket" },
  { slug: "pest", en: "Pest control", my: "ပိုးသတ်", icon: "Bug" },
  { slug: "handyman", en: "Handyman", my: "ထောက်ပံ့သမား", icon: "Hammer" },
  { slug: "furniture", en: "Furniture assembly", my: "ပရိဘောဂ တပ်ဆင်", icon: "Sofa" },
  { slug: "moving", en: "Moving help", my: "ပစ္စည်းသယ်", icon: "Truck" },
  { slug: "water-tank", en: "Water tank cleaning", my: "ရေတိုင်ကီ သန့်ရှင်းရေး", icon: "Droplets" },
  { slug: "generator", en: "Generator repair", my: "ဂျင်နရေတာ ပြုပြင်", icon: "Zap" },
  { slug: "cctv", en: "CCTV installation", my: "CCTV တပ်ဆင်", icon: "Camera" },
  { slug: "internet", en: "Internet / Router setup", my: "အင်တာနက် တပ်ဆင်", icon: "Wifi" },
  { slug: "lock", en: "Lock repair", my: "သော့ ပြုပြင်", icon: "Lock" },
  { slug: "carpentry", en: "Carpentry", my: "လက်သမားလုပ်ငန်း", icon: "Saw" },
  { slug: "masonry", en: "Masonry / Renovation", my: "ပန်းရံ", icon: "Brick" },
  { slug: "gardening", en: "Gardening", my: "ဥယျာဉ်စိုက်ပျိုးရေး", icon: "Trees" },
  { slug: "laundry", en: "Laundry pickup", my: "လျှော်ဖွပ်", icon: "Shirt" },
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
  options: QuestionOption[];
};

const o = (value: string, en: string, my: string): QuestionOption => ({ value, en, my });

export const CATEGORY_QUESTIONS: Record<string, Question[]> = {
  plumbing: [
    {
      id: "leaking_now",
      en: "Is water currently leaking?",
      my: "လောလောဆယ် ရေယိုနေသလား?",
      options: [o("yes", "Yes", "ဟုတ်"), o("no", "No", "မဟုတ်"), o("not_sure", "Not sure", "မသိ")],
    },
  ],
  electrical: [
    {
      id: "safety",
      en: "Is there any safety concern?",
      my: "ဘေးကင်းရေး စိုးရိမ်စရာ ရှိသလား?",
      options: [
        o("spark", "Spark", "မီးပွား"),
        o("smell", "Burning smell", "လောင်ကျွမ်းသော အနံ့"),
        o("smoke", "Smoke", "မီးခိုး"),
        o("none", "No safety concern", "မရှိ"),
        o("not_sure", "Not sure", "မသိ"),
      ],
    },
  ],
  aircon: [
    {
      id: "units",
      en: "How many AC units?",
      my: "အဲကွန်း ဘယ်နှစ်လုံး?",
      options: [o("1", "1", "၁"), o("2", "2", "၂"), o("3", "3", "၃"), o("4+", "4+", "၄+")],
    },
  ],
  cleaning: [
    {
      id: "size",
      en: "Property size",
      my: "အရွယ်အစား",
      options: [
        o("small", "Small apartment", "သေးငယ်သော တိုက်ခန်း"),
        o("medium", "Medium apartment", "အလယ်အလတ် တိုက်ခန်း"),
        o("large", "Large house", "ကြီးမားသော အိမ်"),
        o("office", "Office / shop", "ရုံး/ဆိုင်"),
        o("not_sure", "Not sure", "မသိ"),
      ],
    },
  ],
  moving: [
    {
      id: "vehicle",
      en: "Do you need a vehicle?",
      my: "ယာဉ် လိုသလား?",
      options: [o("yes", "Yes", "ဟုတ်"), o("no", "No", "မလို"), o("not_sure", "Not sure", "မသိ")],
    },
  ],
};

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

// Subcategory presets for category selection step
export const CATEGORY_SUBCATEGORIES: Record<string, { slug: string; en: string; my: string }[]> = {
  plumbing: [
    { slug: "leak", en: "Leak repair", my: "ရေယိုပြုပြင်" },
    { slug: "blocked", en: "Blocked drain", my: "ပိုက်ပိတ်" },
    { slug: "toilet", en: "Toilet repair", my: "အိမ်သာပြုပြင်" },
    { slug: "pipe", en: "Pipe replacement", my: "ပိုက်လဲ" },
    { slug: "pump", en: "Water pump issue", my: "ရေပန့်ပြုပြင်" },
    { slug: "tank", en: "Water tank issue", my: "ရေတိုင်ကီ ပြဿနာ" },
    { slug: "other", en: "Other plumbing problem", my: "အခြား ပိုက်ဆက် ပြဿနာ" },
  ],
  electrical: [
    { slug: "no_power", en: "No power", my: "မီးမလာ" },
    { slug: "switch", en: "Switch / socket", my: "ခလုတ်/ပလပ်ပေါက်" },
    { slug: "wiring", en: "Wiring", my: "ဝါယာကြိုး" },
    { slug: "light_fan", en: "Light / fan", my: "မီး/ပန်ကာ" },
    { slug: "breaker", en: "Breaker", my: "ဘရိတ်ကာ" },
    { slug: "install", en: "Installation", my: "တပ်ဆင်" },
    { slug: "other", en: "Other", my: "အခြား" },
  ],
  aircon: [
    { slug: "clean", en: "Cleaning", my: "သန့်ရှင်းရေး" },
    { slug: "repair", en: "Repair", my: "ပြုပြင်" },
    { slug: "install", en: "Installation", my: "တပ်ဆင်" },
    { slug: "gas", en: "Gas refill", my: "ဂတ်စ်ဖြည့်" },
    { slug: "relocate", en: "Relocation", my: "ပြောင်းရွှေ့" },
  ],
  cleaning: [
    { slug: "regular", en: "Regular house cleaning", my: "ပုံမှန် အိမ်သန့်ရှင်းရေး" },
    { slug: "deep", en: "Deep cleaning", my: "အပြည့်အဝ သန့်ရှင်းရေး" },
    { slug: "move", en: "Move-in / move-out", my: "ပြောင်းရွှေ့" },
    { slug: "office", en: "Office cleaning", my: "ရုံးခန်း" },
    { slug: "post_reno", en: "Post-renovation", my: "ပြုပြင်ပြီး" },
  ],
  moving: [
    { slug: "few", en: "Few items", my: "ပစ္စည်းအနည်းငယ်" },
    { slug: "apt", en: "Full apartment", my: "တိုက်ခန်းအပြည့်" },
    { slug: "house", en: "Full house", my: "အိမ်အပြည့်" },
    { slug: "office", en: "Office / shop", my: "ရုံး/ဆိုင်" },
    { slug: "heavy", en: "Heavy item only", my: "လေးလံသော ပစ္စည်း" },
  ],
};

// Ensure every category has subcategories so providers know the exact issue.
const EXTRA_SUBS: Record<string, { slug: string; en: string; my: string }[]> = {
  appliance: [
    { slug: "fridge", en: "Refrigerator", my: "ရေခဲသေတ္တာ" },
    { slug: "washer", en: "Washing machine", my: "အဝတ်လျှော်စက်" },
    { slug: "microwave", en: "Microwave / oven", my: "မိုက်ခရိုဝေ့ဖ်" },
    { slug: "tv", en: "TV", my: "တီဗီ" },
    { slug: "water_heater", en: "Water heater", my: "ရေပူစက်" },
    { slug: "rice_cooker", en: "Rice cooker / small appliance", my: "ထမင်းအိုး" },
    { slug: "other", en: "Other appliance", my: "အခြား" },
  ],
  painting: [
    { slug: "interior", en: "Interior wall", my: "အတွင်းနံရံ" },
    { slug: "exterior", en: "Exterior wall", my: "အပြင်နံရံ" },
    { slug: "single_room", en: "Single room", my: "အခန်းတစ်ခန်း" },
    { slug: "whole_house", en: "Whole house", my: "အိမ်တစ်လုံး" },
    { slug: "touchup", en: "Touch-up / patch", my: "ဖာထေး" },
    { slug: "wood_metal", en: "Wood / metal paint", my: "သစ်/သံ ဆေး" },
  ],
  pest: [
    { slug: "cockroach", en: "Cockroaches", my: "ပိုးဟပ်" },
    { slug: "ants", en: "Ants", my: "ပုရွက်ဆိတ်" },
    { slug: "termites", en: "Termites", my: "ခြ" },
    { slug: "rats", en: "Rats / mice", my: "ကြွက်" },
    { slug: "mosquito", en: "Mosquitoes", my: "ခြင်" },
    { slug: "bedbugs", en: "Bedbugs", my: "ကြမ်းပိုး" },
    { slug: "general", en: "General pest control", my: "ပိုးသတ်" },
  ],
  handyman: [
    { slug: "mount", en: "Mount / hang items", my: "တပ်ဆင်" },
    { slug: "shelf", en: "Shelves / hooks", my: "စင်/ချိတ်" },
    { slug: "door", en: "Door / window fix", my: "တံခါး ပြုပြင်" },
    { slug: "small_repair", en: "Small repairs", my: "သေးငယ်သော ပြုပြင်" },
    { slug: "assembly", en: "Assembly", my: "တပ်ဆင်" },
    { slug: "other", en: "Other handyman task", my: "အခြား" },
  ],
  furniture: [
    { slug: "bed", en: "Bed frame", my: "ခုတင်" },
    { slug: "wardrobe", en: "Wardrobe", my: "ဗီရို" },
    { slug: "desk", en: "Desk / table", my: "စားပွဲ" },
    { slug: "chair", en: "Chair", my: "ထိုင်ခုံ" },
    { slug: "shelf", en: "Shelf / cabinet", my: "စင်/ဗီရို" },
    { slug: "ikea", en: "Flat-pack (IKEA-style)", my: "ဘောက်စ်ထဲ ပစ္စည်း" },
    { slug: "other", en: "Other furniture", my: "အခြား" },
  ],
  "water-tank": [
    { slug: "overhead", en: "Overhead tank", my: "အပေါ်ထပ် တိုင်ကီ" },
    { slug: "underground", en: "Underground tank", my: "မြေအောက် တိုင်ကီ" },
    { slug: "ground", en: "Ground-level tank", my: "မြေပြင် တိုင်ကီ" },
    { slug: "concrete", en: "Concrete tank", my: "ကွန်ကရစ် တိုင်ကီ" },
    { slug: "plastic", en: "Plastic tank", my: "ပလပ်စတစ် တိုင်ကီ" },
    { slug: "disinfect", en: "Disinfection only", my: "ပိုးသတ်ရေ ဆေး" },
  ],
  generator: [
    { slug: "wont_start", en: "Won't start", my: "မစတင်" },
    { slug: "service", en: "Routine service", my: "ပုံမှန် ပြုပြင်" },
    { slug: "noise", en: "Strange noise", my: "ဆူညံသံ" },
    { slug: "smoke", en: "Smoke / leak", my: "မီးခိုး/ယို" },
    { slug: "install", en: "Installation", my: "တပ်ဆင်" },
    { slug: "other", en: "Other", my: "အခြား" },
  ],
  cctv: [
    { slug: "install", en: "New installation", my: "အသစ် တပ်ဆင်" },
    { slug: "add_camera", en: "Add cameras", my: "ကင်မရာ ထပ်တပ်" },
    { slug: "repair", en: "Repair existing", my: "ပြုပြင်" },
    { slug: "dvr", en: "DVR / NVR issue", my: "DVR ပြဿနာ" },
    { slug: "remote_view", en: "Remote viewing setup", my: "အဝေးကြည့်" },
    { slug: "wiring", en: "Wiring / cabling", my: "ဝါယာ" },
  ],
  internet: [
    { slug: "router_setup", en: "Router setup", my: "ရောက်တာ တပ်ဆင်" },
    { slug: "wifi_weak", en: "Weak WiFi signal", my: "WiFi အားနည်း" },
    { slug: "no_internet", en: "No internet", my: "အင်တာနက် မရ" },
    { slug: "mesh", en: "Mesh / extender", my: "WiFi ပိုဆန့်" },
    { slug: "cabling", en: "Ethernet cabling", my: "ကြိုးတပ်" },
    { slug: "speed", en: "Slow speed", my: "နှေး" },
  ],
  lock: [
    { slug: "door_lock", en: "Door lock", my: "တံခါးသော့" },
    { slug: "padlock", en: "Padlock", my: "သော့ခလောက်" },
    { slug: "digital", en: "Digital / smart lock", my: "ဒစ်ဂျစ်တယ်သော့" },
    { slug: "rekey", en: "Re-key / new keys", my: "သော့အသစ်" },
    { slug: "stuck", en: "Stuck / broken lock", my: "သော့ ပျက်" },
    { slug: "install", en: "New lock installation", my: "သော့ တပ်ဆင်" },
  ],
  carpentry: [
    { slug: "door", en: "Door repair / install", my: "တံခါး" },
    { slug: "window", en: "Window repair", my: "ပြတင်းပေါက်" },
    { slug: "furniture_repair", en: "Furniture repair", my: "ပရိဘောဂ ပြုပြင်" },
    { slug: "custom", en: "Custom build", my: "အထူး ပြုလုပ်" },
    { slug: "shelves", en: "Shelves / cabinets", my: "စင်/ဗီရို" },
    { slug: "flooring", en: "Wood flooring", my: "သစ်သား ကြမ်းခင်း" },
  ],
  masonry: [
    { slug: "wall_repair", en: "Wall repair", my: "နံရံ ပြုပြင်" },
    { slug: "tiles", en: "Tile work", my: "အုတ်ကြွပ်" },
    { slug: "plaster", en: "Plaster / cement work", my: "အင်္ဂတေ" },
    { slug: "leak_seal", en: "Leak sealing", my: "ရေယိုစည်း" },
    { slug: "renovation", en: "Renovation", my: "ပြုပြင်မွမ်းမံ" },
    { slug: "new_build", en: "New construction", my: "အသစ်တည်ဆောက်" },
  ],
  gardening: [
    { slug: "lawn", en: "Lawn mowing", my: "မြက်ရိတ်" },
    { slug: "trim", en: "Tree / hedge trimming", my: "သစ်ပင် ဖြတ်" },
    { slug: "planting", en: "Planting", my: "စိုက်ပျိုး" },
    { slug: "cleanup", en: "Garden cleanup", my: "ဥယျာဉ် ရှင်းလင်း" },
    { slug: "design", en: "Garden design", my: "ဒီဇိုင်း" },
    { slug: "watering", en: "Irrigation / watering", my: "ရေပေး" },
  ],
  laundry: [
    { slug: "wash_fold", en: "Wash & fold", my: "လျှော် + ခေါက်" },
    { slug: "dry_clean", en: "Dry cleaning", my: "ဒရိုင်ကလင်း" },
    { slug: "ironing", en: "Ironing only", my: "မီးပူတိုက်" },
    { slug: "bedding", en: "Bedding / curtains", my: "အိပ်ရာခင်း/ကန့်လန့်ကာ" },
    { slug: "express", en: "Express same-day", my: "ဒီနေ့ ပြန်ပို့" },
    { slug: "pickup", en: "Pickup & delivery", my: "ယူ + ပို့" },
  ],
};

for (const [k, v] of Object.entries(EXTRA_SUBS)) {
  if (!CATEGORY_SUBCATEGORIES[k]) CATEGORY_SUBCATEGORIES[k] = v;
}