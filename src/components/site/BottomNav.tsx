import { Link, useLocation } from "@tanstack/react-router";
import { Home, LayoutGrid, PlusCircle, Users, User, Briefcase, Shield, ClipboardList, MessageSquare, Calendar } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

type NavItem = {
  to: string;
  icon: typeof Home;
  en: string;
  my: string;
  primary?: boolean;
  search?: Record<string, string>;
};

export function BottomNav() {
  const { lang } = useI18n();
  const { user, roles, loading, rolesReady } = useAuth();
  const { pathname } = useLocation();

  const isProvider = roles.includes("provider");
  const isAdmin = roles.includes("admin");

  // Hide on flows that have their own fixed bottom action bar to avoid overlap.
  if (pathname.startsWith("/request/new")) return null;

  // While auth (including roles) is still resolving, don't render nav to avoid
  // flashing the wrong set of items (e.g. guest nav briefly for a signed-in user).
  if (loading || !rolesReady) return null;

  const items: NavItem[] = isAdmin
    ? [
        { to: "/", icon: Home, en: "Home", my: "ပင်မ" },
        { to: "/providers", icon: Users, en: "Pros", my: "ပညာရှင်", search: { cat: "", city: "" } },
        { to: "/admin", icon: Shield, en: "Admin", my: "Admin", primary: true },
        { to: "/my-requests", icon: Briefcase, en: "Requests", my: "တောင်းဆို" },
        { to: "/account", icon: User, en: "Account", my: "အကောင့်" },
      ]
    : isProvider
      ? [
          { to: "/", icon: Home, en: "Home", my: "ပင်မ" },
            { to: "/provider/dashboard", icon: Briefcase, en: "My Jobs", my: "အလုပ်" },
            { to: "/messages", icon: MessageSquare, en: "Messages", my: "မက်ဆေ့ဂျ်", primary: true },
            { to: "/provider/calendar", icon: Calendar, en: "My Calendar", my: "ပြက္ခဒိန်" },
          { to: "/account", icon: User, en: "Account", my: "အကောင့်" },
        ]
      : user
        ? [
            { to: "/", icon: Home, en: "Home", my: "ပင်မ" },
            { to: "/my-requests", icon: ClipboardList, en: "My Requests", my: "တောင်းဆို" },
            { to: "/request/new", icon: PlusCircle, en: "Request", my: "တောင်းရန်", primary: true },
            { to: "/providers", icon: Users, en: "Pros", my: "ပညာရှင်", search: { cat: "", city: "" } },
            { to: "/account", icon: User, en: "Account", my: "အကောင့်" },
          ]
        : [
            { to: "/", icon: Home, en: "Home", my: "ပင်မ" },
            { to: "/services", icon: LayoutGrid, en: "Services", my: "ဝန်ဆောင်" },
            { to: "/request/new", icon: PlusCircle, en: "Request", my: "တောင်းရန်", primary: true },
            { to: "/providers", icon: Users, en: "Pros", my: "ပညာရှင်", search: { cat: "", city: "" } },
            { to: "/signin", icon: User, en: "Sign in", my: "ဝင်ရောက်" },
          ];

  return (
    <nav
      aria-label="Bottom navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex h-16 max-w-screen-md items-stretch justify-between px-2">
        {items.map((it) => {
          const Icon = it.icon;
          const active =
            it.to === "/"
              ? pathname === "/"
              : pathname === it.to || pathname.startsWith(it.to + "/");
          return (
            <li key={it.to} className="flex-1">
              <Link
                to={it.to as "/"}
                search={it.search as Record<string, never>}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-full flex-col items-center justify-center gap-0.5 text-[10px] font-semibold tracking-tight transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <span
                  className={`pointer-events-none absolute inset-x-6 top-0 h-0.5 rounded-full bg-primary transition-opacity ${
                    active ? "opacity-100" : "opacity-0"
                  }`}
                />
                <Icon className={`h-5 w-5 ${active ? "stroke-[2.4]" : ""}`} />
                <span>{lang === "en" ? it.en : it.my}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}