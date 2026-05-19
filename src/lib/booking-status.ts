// Single source of truth for "where is this job/booking in its lifecycle".
// Both customer and provider screens render status, badges, and next-action
// hints from this module — keeps the UI consistent across roles.

export type BookingState =
  | "requested"
  | "quoted"
  | "scheduled_pending"
  | "scheduled_confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";

type BookingLike = {
  status?: string | null;
  scheduled_at?: string | null;
  time_confirmed_by_customer?: boolean | null;
  time_confirmed_by_provider?: boolean | null;
} | null | undefined;

type JobLike = {
  status?: string | null;
  quotes_count?: number;
} | null | undefined;

export function deriveBookingState(booking: BookingLike, job?: JobLike): BookingState {
  if (booking) {
    const s = booking.status ?? "";
    if (s === "completed") return "completed";
    if (s === "cancelled") return "cancelled";
    if (s === "in_progress" || s === "started" || s === "on_the_way") return "in_progress";
    if (booking.scheduled_at) {
      const bothConfirmed =
        !!booking.time_confirmed_by_customer && !!booking.time_confirmed_by_provider;
      return bothConfirmed ? "scheduled_confirmed" : "scheduled_pending";
    }
  }
  if (job) {
    const s = job.status ?? "";
    if (s === "cancelled") return "cancelled";
    if (s === "completed") return "completed";
    if (s === "quoted" || (job.quotes_count ?? 0) > 0) return "quoted";
  }
  return "requested";
}

export type StatusMeta = {
  state: BookingState;
  tone: "pending" | "active" | "confirmed" | "done" | "cancelled";
  en: string;
  my: string;
};

const META: Record<BookingState, StatusMeta> = {
  requested:           { state: "requested",           tone: "pending",   en: "Awaiting quotes",   my: "စျေးနှုန်း စောင့်" },
  quoted:              { state: "quoted",              tone: "active",    en: "Quotes received",   my: "စျေးနှုန်း ရရှိ" },
  scheduled_pending:   { state: "scheduled_pending",   tone: "pending",   en: "Time to confirm",   my: "ချိန်းချက် အတည်ပြုရန်" },
  scheduled_confirmed: { state: "scheduled_confirmed", tone: "confirmed", en: "Scheduled",         my: "စီစဉ်ပြီး" },
  in_progress:         { state: "in_progress",         tone: "active",    en: "In progress",       my: "လုပ်ဆောင်နေ" },
  completed:           { state: "completed",           tone: "done",      en: "Completed",         my: "ပြီးစီး" },
  cancelled:           { state: "cancelled",           tone: "cancelled", en: "Cancelled",         my: "ပယ်ဖျက်" },
};

export function statusMeta(state: BookingState): StatusMeta {
  return META[state];
}

export type NextAction = { en: string; my: string } | null;

// One-liner that tells the user what to do next. Returns null when the ball
// is in the other party's court (UI can show "Waiting for ..." instead).
export function nextActionFor(
  state: BookingState,
  role: "customer" | "provider",
): NextAction {
  if (role === "customer") {
    switch (state) {
      case "requested":           return { en: "Invite providers to quote", my: "ပညာရှင်များ ဖိတ်ပါ" };
      case "quoted":              return { en: "Review quotes & pick one",   my: "စျေးနှုန်းများ ရွေးပါ" };
      case "scheduled_pending":   return { en: "Confirm the proposed time",  my: "အချိန် အတည်ပြုပါ" };
      case "scheduled_confirmed": return { en: "Provider is on the way",     my: "ပညာရှင် လာနေသည်" };
      case "in_progress":         return { en: "Service in progress",        my: "လုပ်ဆောင်နေ" };
      case "completed":           return { en: "Leave a review",             my: "သုံးသပ်ချက် ပေး" };
      case "cancelled":           return null;
    }
  } else {
    switch (state) {
      case "requested":           return { en: "Send a quote",                my: "စျေးနှုန်း ပို့ပါ" };
      case "quoted":              return { en: "Awaiting customer choice",    my: "ဖောက်သည် စောင့်" };
      case "scheduled_pending":   return { en: "Propose or confirm a time",   my: "အချိန် အတည်ပြုပါ" };
      case "scheduled_confirmed": return { en: "Show up & start work",        my: "အလုပ် စတင်ပါ" };
      case "in_progress":         return { en: "Mark complete when done",     my: "ပြီးပါက မှတ်သားပါ" };
      case "completed":           return null;
      case "cancelled":           return null;
    }
  }
}