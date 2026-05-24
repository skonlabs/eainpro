import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wallet, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getWallet, fmt } from "@/lib/wallet";
import { supabase } from "@/lib/supabase";

type Props = { size?: "sm" | "md" };

export function CreditsBadge({ size = "md" }: Props) {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      const w = await getWallet(user.id);
      if (!cancelled) setBalance(w?.balance_credits ?? 0);
    };
    load();
    const ch = supabase
      .channel(`wallet-badge-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets", filter: `provider_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [user?.id]);

  if (!user) return null;

  const pad = size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-base";
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <Link
      to="/provider/wallet"
      aria-label="Wallet balance"
      className={`group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary/85 ${pad} font-semibold text-primary-foreground shadow-md shadow-primary/25 ring-1 ring-primary/40 transition hover:shadow-lg hover:shadow-primary/30`}
    >
      <Wallet className={iconSize} />
      <span className="tabular-nums">{balance === null ? "—" : fmt(balance)}</span>
      <span className="opacity-90">credits</span>
      <span className="ml-1 hidden items-center gap-0.5 rounded-full bg-primary-foreground/15 px-1.5 py-0.5 text-xs sm:inline-flex">
        <Plus className="h-3 w-3" /> Top up
      </span>
    </Link>
  );
}