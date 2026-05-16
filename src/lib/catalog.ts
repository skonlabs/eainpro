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