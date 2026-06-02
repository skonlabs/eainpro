import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

/**
 * Monitors the signed-in user's block status.
 * - Soft block: shows a persistent banner explaining restrictions.
 * - Hard block: forces sign-out immediately.
 */
export function BlockedBanner() {
  const { user, signOut } = useAuth();
  const { lang } = useI18n();
  const L = (en: string, my: string) => (lang === "en" ? en : my);
  const [blocked, setBlocked] = useState<{ type: "soft" | "hard"; reason: string | null } | null>(null);

  useEffect(() => {
    if (!user) { setBlocked(null); return; }
    let cancelled = false;
    const check = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("is_blocked, block_type, blocked_reason")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data?.is_blocked) {
        const type = (data.block_type as "soft" | "hard") ?? "soft";
        if (type === "hard") {
          toast.error(L(
            "Your account has been blocked. You have been signed out.",
            "သင်၏ အကောင့်ကို ပိတ်ဆို့ထားသည်။ ထွက်ပြီးသွားပါပြီ။",
          ));
          void signOut();
          return;
        }
        setBlocked({ type, reason: data.blocked_reason ?? null });
      } else {
        setBlocked(null);
      }
    };
    void check();
    // Re-check on profile changes (admin block while user is online).
    const ch = supabase
      .channel(`profile-block-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        () => void check(),
      )
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [user, signOut]);

  if (!blocked) return null;
  return (
    <div className="mx-auto w-full max-w-screen-md px-3 pt-2 sm:px-4">
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
        <p className="font-semibold">{L("Your account is suspended.", "သင်၏ အကောင့် ဆိုင်းငံ့ထားသည်။")}</p>
        <p className="mt-1 text-xs leading-relaxed">
          {L(
            "You can still browse, but you cannot submit a request, send messages, book a job, leave reviews, or view/unlock leads.",
            "ကြည့်ရှုနိုင်သော်လည်း တောင်းဆိုမှု၊ မက်ဆေ့ပို့ခြင်း၊ ဘွတ်ကင်လုပ်ခြင်း၊ သုံးသပ်ချက်ပေးခြင်း နှင့် Lead ကြည့်ခြင်း ပြုလုပ်၍ မရပါ။",
          )}
          {blocked.reason
            ? ` ${L("Reason:", "အကြောင်းပြချက်:")} ${blocked.reason}.`
            : ""}{" "}
          {L("Contact support to resolve this.", "ဖြေရှင်းရန် ကျွန်ုပ်တို့ကို ဆက်သွယ်ပါ။")}
        </p>
      </div>
    </div>
  );
}
