import type { Lang } from "@/lib/i18n";

// Bilingual labels for raw booking/job status strings rendered in badges.
const BOOKING_STATUS: Record<string, { en: string; my: string }> = {
  pending:       { en: "Pending",        my: "စောင့်ဆိုင်း" },
  requested:     { en: "Requested",      my: "တောင်းဆို" },
  open:          { en: "Open",           my: "ဖွင့်ထား" },
  quoted:        { en: "Quoted",         my: "စျေးပေး" },
  accepted:      { en: "Booked",         my: "ဘွတ်ကင်ပြီး" },
  booked:        { en: "Booked",         my: "ဘွတ်ကင်ပြီး" },
  scheduled:     { en: "Scheduled",      my: "စီစဉ်ပြီး" },
  on_the_way:    { en: "On the way",     my: "လမ်းပေါ်ရောက်" },
  started:       { en: "In progress",    my: "လုပ်ဆောင်နေ" },
  in_progress:   { en: "In progress",    my: "လုပ်ဆောင်နေ" },
  completed:     { en: "Completed",      my: "ပြီးစီး" },
  cancelled:     { en: "Cancelled",      my: "ပယ်ဖျက်" },
  closed:        { en: "Closed",         my: "ပိတ်ထား" },
  expired:       { en: "Expired",        my: "သက်တမ်းကုန်" },
};

// Provider-side lead unlock workflow statuses.
const UNLOCK_STATUS: Record<string, { en: string; my: string; hint_en: string; hint_my: string }> = {
  unlocked:             { en: "New — not contacted yet",         my: "အသစ် — မဆက်သွယ်ရသေး",
                          hint_en: "You just unlocked this lead.",
                          hint_my: "ဤ lead ကို ဖွင့်ပြီးပါပြီ။" },
  contacted:            { en: "Contacted customer",              my: "ဖောက်သည်ကို ဆက်သွယ်ပြီး",
                          hint_en: "Use after you've called or messaged the customer.",
                          hint_my: "ဖောက်သည်ကို ဖုန်း/မက်ဆေ့ ပို့ပြီးမှ သုံးပါ။" },
  quoted:               { en: "Quote sent",                      my: "စျေးနှုန်း ပို့ပြီး",
                          hint_en: "Set automatically when you send a quote.",
                          hint_my: "စျေးနှုန်း ပို့ပြီးပါက အလိုအလျောက် ဖြစ်သည်။" },
  won:                  { en: "Won — customer accepted",         my: "အောင်မြင် — ဖောက်သည် လက်ခံ",
                          hint_en: "Customer agreed to hire you.",
                          hint_my: "ဖောက်သည်က သင့်ကို ငှားရန် သဘောတူပါပြီ။" },
  lost:                 { en: "Lost — chose another provider",   my: "လက်လွတ် — အခြားသူ ရွေး",
                          hint_en: "Customer picked someone else or declined.",
                          hint_my: "ဖောက်သည်က အခြားသူကို ရွေးခဲ့သည်။" },
  customer_no_response: { en: "No response from customer",       my: "ဖောက်သည် မပြန်ပါ",
                          hint_en: "You tried to reach them but got no reply.",
                          hint_my: "ဆက်သွယ်ရန် ကြိုးစားသော်လည်း မရရှိပါ။" },
  invalid:              { en: "Invalid lead",                    my: "မမှန်ကန်သော Lead",
                          hint_en: "Wrong info, spam, or fraud — also submit a refund report.",
                          hint_my: "မမှန်/ဖြားယောင်း — refund report လည်း တင်ပါ။" },
  completed:            { en: "Job completed",                   my: "အလုပ် ပြီးစီး",
                          hint_en: "Work is finished. (Bookings auto-update this too.)",
                          hint_my: "အလုပ်ပြီးပြီ။ (Bookings မှ အလိုအလျောက်လည်း တင်သည်။)" },
};

export function tBookingStatus(status: string, lang: Lang): string {
  const m = BOOKING_STATUS[status];
  if (!m) return status.replace(/_/g, " ");
  return lang === "en" ? m.en : m.my;
}

export function tUnlockStatus(status: string, lang: Lang): string {
  const m = UNLOCK_STATUS[status];
  if (!m) return status.replace(/_/g, " ");
  return lang === "en" ? m.en : m.my;
}

export function tUnlockHint(status: string, lang: Lang): string {
  const m = UNLOCK_STATUS[status];
  if (!m) return "";
  return lang === "en" ? m.hint_en : m.hint_my;
}
