import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { GuestHome } from "@/components/home/GuestHome";
import { CustomerHome } from "@/components/home/CustomerHome";
import { ProviderHome } from "@/components/home/ProviderHome";
import { AdminHome } from "@/components/home/AdminHome";
import { LoadingState } from "@/components/site/LoadingState";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Home — Fixido" },
      { name: "description", content: "Your Fixido home." },
    ],
  }),
});

function Index() {
  const { lang } = useI18n();
  const { user, roles, loading: authLoading } = useAuth();

  const L = (en: string, my: string) => (lang === "en" ? en : my);
  const isProvider = roles.includes("provider");
  const isAdmin = roles.includes("admin");

  if (authLoading) {
    return <LoadingState label={L("Loading…", "ခဏစောင့်ပါ…")} />;
  }

  if (!user) return <GuestHome lang={lang} L={L} />;

  const firstName =
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
    user.email?.split("@")[0] ||
    L("there", "မိတ်ဆွေ");

  if (isAdmin && !isProvider) return <AdminHome name={firstName} L={L} />;
  if (isProvider) return <ProviderHome userId={user.id} name={firstName} lang={lang} L={L} />;
  return <CustomerHome userId={user.id} name={firstName} lang={lang} L={L} />;
}