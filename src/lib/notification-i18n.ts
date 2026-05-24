import type { Lang } from "@/lib/i18n";

type Pair = { en: string; my: string };

// Static title translations by exact text.
const TITLES: Pair[] = [
  { en: "New message", my: "မက်ဆေ့ဂျ်အသစ်" },
  { en: "Your quote was accepted", my: "သင့်စျေးနှုန်းကို လက်ခံပြီးပါပြီ" },
  { en: "Booking confirmed", my: "ဘွတ်ကင် အတည်ပြုပြီး" },
  { en: "Booking cancelled", my: "ဘွတ်ကင် ပယ်ဖျက်လိုက်ပြီ" },
  { en: "Booking status updated", my: "ဘွတ်ကင်အခြေအနေ ပြောင်းလဲ" },
  { en: "Service completed", my: "ဝန်ဆောင်မှု ပြီးစီး" },
  { en: "Provider is on the way", my: "ဝန်ဆောင်မှုပေးသူ လမ်းပေါ်ရောက်နေပြီ" },
  { en: "Work has started", my: "အလုပ် စတင်ပြီး" },
  { en: "Top-up rejected", my: "ငွေဖြည့်ခြင်း ပယ်ချ" },
  { en: "Low wallet balance", my: "ပိုက်ဆံအိတ် လက်ကျန် နည်းပါးနေ" },
  { en: "You lost a lead", my: "Lead တစ်ခု လက်လွတ်" },
  { en: "Job marked completed", my: "အလုပ် ပြီးစီးကြောင်း မှတ်သားပြီး" },
  { en: "Job started", my: "အလုပ် စတင်ပြီး" },
  { en: "Job in progress", my: "အလုပ် ဆောင်ရွက်ဆဲ" },
  { en: "Customer cancelled a lead", my: "ဖောက်သည် Lead ကို ပယ်ဖျက်လိုက်ပြီ" },
  { en: "Lead closed — customer chose another provider", my: "Lead ပိတ်ပြီး — ဖောက်သည် အခြားသူကိုရွေး" },
];

const BODIES: Pair[] = [
  { en: "Tap to review the details and accept.", my: "အသေးစိတ်ကြည့်ပြီး လက်ခံရန် နှိပ်ပါ။" },
  { en: "You have a new booking. Propose a visit time to lock it in.", my: "ဘွတ်ကင်အသစ်ရှိပါသည်။ လာရောက်ချိန် အဆိုပြုပါ။" },
  { en: "You have a new booking. Contact details are now shared.", my: "ဘွတ်ကင်အသစ်ရှိပါသည်။ ဆက်သွယ်ရန် အချက်အလက်များ မျှဝေပြီးပြီ။" },
  { en: "The provider has been notified. Agree on a visit time to get started.", my: "ဝန်ဆောင်မှုပေးသူကို အကြောင်းကြားပြီးပါပြီ။ လာရောက်ချိန် သဘောတူပါ။" },
  { en: "The provider has been notified. They will propose a visit time shortly.", my: "ဝန်ဆောင်မှုပေးသူ မကြာမီ လာရောက်ချိန် အဆိုပြုပါမည်။" },
  { en: "The provider has been notified. They will contact you soon.", my: "ဝန်ဆောင်မှုပေးသူက မကြာမီ ဆက်သွယ်ပါမည်။" },
  { en: "How did it go? Leave a quick review.", my: "ဘယ်လိုလဲ? အမြန် သုံးသပ်ချက်ပေးပါ။" },
  { en: "How did it go? Leave a quick review and add photos if you like.", my: "ဘယ်လိုလဲ? သုံးသပ်ချက်နှင့် ဓာတ်ပုံများ ထည့်ပါ။" },
  { en: "Booking was cancelled.", my: "ဘွတ်ကင်ကို ပယ်ဖျက်လိုက်ပါသည်။" },
  { en: "They are heading to your address now.", my: "သင့်လိပ်စာဆီ လာနေပါပြီ။" },
  { en: "Your provider has started the job.", my: "ဝန်ဆောင်မှုပေးသူ အလုပ်စပြီ။" },
  { en: "Open the request to see details.", my: "အသေးစိတ်အတွက် တောင်းဆိုမှုကို ဖွင့်ပါ။" },
  { en: "A customer sent this request directly to you. Unlock to see details.", my: "ဖောက်သည်က ဤတောင်းဆိုမှုကို သင့်ထံ တိုက်ရိုက်ပို့ထားသည်။ အသေးစိတ်ကြည့်ရန် Unlock လုပ်ပါ။" },
  { en: "A refund was issued for a lead unlock.", my: "Lead unlock အတွက် ပြန်အမ်းငွေ ထုတ်ပေးပြီး။" },
  { en: "They may contact you shortly.", my: "မကြာမီ သင့်ကို ဆက်သွယ်ပါမည်။" },
  { en: "Please contact support.", my: "ကျေးဇူးပြု၍ support ကို ဆက်သွယ်ပါ။" },
];

function translateExact(text: string | null | undefined, table: Pair[], lang: Lang): string {
  if (!text) return text ?? "";
  if (lang !== "my") return text;
  const hit = table.find((p) => p.en === text);
  return hit ? hit.my : text;
}

export function translateNotificationTitle(title: string, lang: Lang): string {
  if (lang !== "my") return title;
  // Patterns
  let m = title.match(/^(.+) sent a quote$/);
  if (m) return `${m[1]} က စျေးနှုန်းပေးပို့ပါသည်`;
  m = title.match(/^(.+) viewed your request$/);
  if (m) return `${m[1]} သင့်တောင်းဆိုမှုကို ကြည့်ရှုခဲ့သည်`;
  m = title.match(/^Top-up approved · \+(.+) credits$/);
  if (m) return `ငွေဖြည့်ခြင်း အတည်ပြု · +${m[1]} credits`;
  m = title.match(/^Refund issued · \+(.+) credits$/);
  if (m) return `ပြန်အမ်းငွေ ထုတ်ပေး · +${m[1]} credits`;
  m = title.match(/^Direct request:\s*(.+)$/);
  if (m) return `တိုက်ရိုက်တောင်းဆိုမှု: ${m[1]}`;
  m = title.match(/^New (.+) lead in (.+)$/);
  if (m) return `${m[2]} တွင် ${m[1]} lead အသစ်`;
  m = title.match(/^Booking (.+)$/);
  if (m) return `ဘွတ်ကင် ${bookingStatusMy(m[1])}`;
  return translateExact(title, TITLES, lang);
}

export function translateNotificationBody(body: string | null, lang: Lang): string | null {
  if (!body) return body;
  if (lang !== "my") return body;
  let m = body.match(/^Your booking status is now (.+)\.$/);
  if (m) return `သင့်ဘွတ်ကင်အခြေအနေသည် ${bookingStatusMy(m[1])} ဖြစ်ပါပြီ။`;
  m = body.match(/^A booking status is now (.+)\.$/);
  if (m) return `ဘွတ်ကင်အခြေအနေသည် ${bookingStatusMy(m[1])} ဖြစ်ပါပြီ။`;
  m = body.match(/^The (.+) lead in (.+) was booked with someone else\.$/);
  if (m) return `${m[2]} ရှိ ${m[1]} lead ကို အခြားသူနှင့် ဘွတ်ကင်လုပ်လိုက်ပါပြီ။`;
  m = body.match(/^The customer cancelled "(.+)"\. No further action needed\.$/);
  if (m) return `ဖောက်သည်က "${m[1]}" ကို ပယ်ဖျက်လိုက်ပါပြီ။ နောက်ထပ် ဆောင်ရွက်စရာ မလိုပါ။`;
  m = body.match(/^You have (.+) credits left\. Top up to keep unlocking leads\.$/);
  if (m) return `သင့်တွင် ${m[1]} credits ကျန်ပါသည်။ Lead များ ဆက်လက် unlock လုပ်ရန် ငွေဖြည့်ပါ။`;
  m = body.match(/^Unlock for (.+) credits to see customer details\.$/);
  if (m) return `ဖောက်သည် အချက်အလက်များကြည့်ရန် ${m[1]} credits ဖြင့် unlock လုပ်ပါ။`;
  m = body.match(/^(.+) package added to your wallet\.$/);
  if (m) return `${m[1]} package ကို သင့်ပိုက်ဆံအိတ်ထဲ ထည့်ပြီးပါပြီ။`;
  return translateExact(body, BODIES, lang);
}

function bookingStatusMy(s: string): string {
  const map: Record<string, string> = {
    pending: "စောင့်ဆိုင်းနေ",
    accepted: "လက်ခံပြီး",
    booked: "ဘွတ်ကင်ပြီး",
    scheduled: "အချိန်သတ်မှတ်ပြီး",
    on_the_way: "လမ်းပေါ်ရောက်နေပြီ",
    started: "စတင်ပြီး",
    in_progress: "ဆောင်ရွက်ဆဲ",
    completed: "ပြီးစီး",
    cancelled: "ပယ်ဖျက်ပြီး",
    closed: "ပိတ်ထား",
    expired: "သက်တမ်းကုန်",
  };
  return map[s] ?? s.replace(/_/g, " ");
}
