import { Link, useLocation } from "@tanstack/react-router";
import { Home, LayoutGrid, PlusCircle, Users, User } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function BottomNav() {
  const { lang } = useI18n();
  const { pathname } = useLocation();

  const items: Array<{
    to: "/" | "/services" | "/post-job" | "/providers" | "/signin";
    icon: typeof Home;
    en: string;
    my: string;
    primary?: boolean;
  }> = [
    { to: "/", icon: Home, en: "Home", my: "ပင်မ" },
    { to: "/services", icon: LayoutGrid, en: "Services", my: "ဝန်ဆောင်" },
    { to: "/post-job", icon: PlusCircle, en: "Post", my: "တင်ရန်", primary: true },
    { to: "/providers", icon: Users, en: "Pros", my: "ပညာရှင်" },
    { to: "/signin", icon: User, en: "Account", my: "အကောင့်" },
  ];

  return (
    <nav
      aria-label="Bottom navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {items.map((it) => {
          const Icon = it.icon;
          const active =
            it.to === "/"
              ? pathname === "/"
              : pathname === it.to || pathname.startsWith(it.to + "/");
          return (
            <li key={it.to} className="flex-1">
              <Link
                to={it.to}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <span
                  className={`grid h-9 w-9 place-items-center rounded-full ${
                    it.primary
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                      : active
                      ? "bg-secondary"
                      : ""
                  }`}
                >
                  <Icon className={it.primary ? "h-5 w-5" : "h-[18px] w-[18px]"} />
                </span>
                <span>{lang === "en" ? it.en : it.my}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}