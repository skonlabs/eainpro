import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Wallet, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { getWallet, fmt } from "@/lib/wallet";
import { supabase } from "@/lib/supabase";

type Props = { size?: "sm" | "md"; variant?: "solid" | "onDark"; compact?: boolean };

export function CreditsBadge({ size = "md", variant = "solid", compact = false }: Props) {
  const { user } = useAuth();
  const { lang } = useI18n();
  const L = (en: string, my: string) => (lang === "en" ? en : my);
  const [balance, setBalance] = useState<number | null>(null);
  const channelInstanceRef = useRef(`badge${Math.random().toString(36).slice(2, 10)}`);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      const w = await getWallet(user.id);
      if (!cancelled) setBalance(w?.balance_credits ?? 0);
    };
    load();
    const ch = supabase
      .channel(`wallet-badge-${user.id}-${channelInstanceRef.current}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "provider_wallets", filter: `provider_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [user?.id]);

  if (!user) return null;

  const pad = size === "sm" ? "h-9 px-3 text-sm" : "h-10 px-4 text-base";
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  const surface =
    variant === "onDark"
      ? "bg-white/15 text-primary-foreground ring-1 ring-white/25 backdrop-blur hover:bg-white/20"
      : "bg-gradient-to-r from-primary to-primary/85 text-primary-foreground shadow-md shadow-primary/25 ring-1 ring-primary/40 hover:shadow-lg hover:shadow-primary/30";
  const chip =
    variant === "onDark"
      ? "bg-white/20 text-primary-foreground"
      : "bg-primary-foreground/15 text-primary-foreground";

  return (
    <Link
      to="/provider/wallet"
      aria-label={L("Wallet balance", "ပိုက်ဆံအိတ် လက်ကျန်")}
      className={`group inline-flex items-center gap-2 rounded-full ${surface} ${pad} font-semibold transition`}
    >
      <Wallet className={iconSize} />
      <span className="tabular-nums">{balance === null ? "—" : fmt(balance)}</span>
      {!compact && <span className="opacity-90">{L("credits", "credits")}</span>}
      <span className={`ml-1 inline-flex items-center gap-0.5 rounded-full ${chip} px-1.5 py-0.5 text-xs`}>
        <Plus className="h-3 w-3" />
        {!compact && <span className="hidden sm:inline">{L("Top up", "ဖြည့်ပါ")}</span>}
      </span>
    </Link>
  );
}