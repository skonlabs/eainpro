import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

/**
 * Monitors the signed-in user's block status.
 * - Soft block: shows a persistent banner explaining restrictions.
 * - Hard block: forces sign-out immediately.
 */
export function BlockedBanner() {
  const { user, signOut } = useAuth();
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
          toast.error("Your account has been blocked. You have been signed out.");
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
      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        <p className="font-semibold">Your account is restricted.</p>
        <p className="mt-1 text-xs">
          You cannot create requests, send messages, book, leave reviews, or unlock leads.
          {blocked.reason ? ` Reason: ${blocked.reason}.` : ""} Contact support to resolve this.
        </p>
      </div>
    </div>
  );
}
