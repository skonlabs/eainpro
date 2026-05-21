import { Link, useLocation } from "@tanstack/react-router";
import { Home, LayoutGrid, PlusCircle, Users, User, Briefcase, Shield, ClipboardList, MessageSquare, Wallet, Inbox, Wallet2 } from "lucide-react";
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
  const { pathname, search } = useLocation();

  const isProvider = roles.includes("provider");
  const isAdmin = roles.includes("admin");

  // While auth (including roles) is still resolving, don't render nav to avoid
  // flashing the wrong set of items (e.g. guest nav briefly for a signed-in user).
  if (loading || !rolesReady) return null;

  const items: NavItem[] = isAdmin
    ? [
        { to: "/", icon: Home, en: "Home", my: "ပင်မ" },
        { to: "/providers", icon: Users, en: "Pros", my: "ပညာရှင်", search: { cat: "", city: "" } },
        { to: "/admin", icon: Shield, en: "Admin", my: "Admin", primary: true },
        { to: "/admin", icon: Wallet2, en: "Top-ups", my: "ငွေဖြည့်", search: { tab: "topups" } },
        { to: "/account", icon: User, en: "Account", my: "အကောင့်" },
      ]
    : isProvider
      ? [
          { to: "/", icon: Home, en: "Home", my: "ပင်မ" },
            { to: "/provider/leads", icon: Inbox, en: "Leads", my: "Lead များ" },
            { to: "/provider/dashboard", icon: Briefcase, en: "Jobs", my: "အလုပ်", primary: true },
            { to: "/provider/wallet", icon: Wallet, en: "Wallet", my: "ပိုက်ဆံအိတ်" },
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
        // If any item targeting the same path has a `search.tab`, treat items as
        // tab-scoped so we don't activate two entries at once (e.g. /admin vs /admin?tab=topups).
        const tabScopedPaths = new Set(
          items.filter((i) => i.search?.tab).map((i) => i.to),
        );
        const currentTab = (search as Record<string, unknown> | undefined)?.tab as string | undefined;
        return items.map((it) => {
          const Icon = it.icon;
          let active: boolean;
          if (it.to === "/") {
            active = pathname === "/";
          } else if (tabScopedPaths.has(it.to)) {
            const pathMatch = pathname === it.to || pathname.startsWith(it.to + "/");
            const itemTab = it.search?.tab;
            if (itemTab) {
              active = pathMatch && currentTab === itemTab;
            } else {
              // Base item (no tab) is active only when no tab-scoped sibling matches.
              active = pathMatch && !currentTab;
            }
          } else {
            active = pathname === it.to || pathname.startsWith(it.to + "/");
          }
          return (
            <li key={it.to} className="flex-1">
              <Link
                to={it.to as "/"}
                search={it.search as Record<string, never>}
                aria-current={active ? "page" : undefined}
                className="relative flex h-full flex-col items-center justify-center text-[10px] font-semibold tracking-tight"
              >
                <span
                  className={`flex h-12 w-16 flex-col items-center justify-center gap-0.5 rounded-2xl transition-all ${
                    active
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                      : "text-muted-foreground"
                  } ${it.primary && !active ? "ring-1 ring-primary/30 text-primary" : ""}`}
                >
                  <Icon className={`h-5 w-5 ${active ? "stroke-[2.4]" : ""}`} />
                  <span className="leading-none">{lang === "en" ? it.en : it.my}</span>
                </span>
              </Link>
            </li>
          );
        });
        })()}
      </ul>
    </nav>
  );
}