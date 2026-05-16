import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export function Header() {
  const { t, lang, setLang } = useI18n();
  const { user, signOut } = useAuth();
  const toggle = () => setLang(lang === "en" ? "my" : "en");

  return (
    <header
      className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/75 backdrop-blur-xl"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground font-extrabold shadow-lg shadow-primary/25">
            E
          </div>
          <span className="text-base font-bold tracking-tight sm:text-lg">{t("brand")}</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link to="/services" className="text-foreground/80 hover:text-foreground">
            {t("nav_services")}
          </Link>
          <Link to="/providers" className="text-foreground/80 hover:text-foreground">
            {t("nav_providers")}
          </Link>
          {user && (
            <Link to="/my-requests" className="text-foreground/80 hover:text-foreground">
              {lang === "en" ? "My requests" : "ကျွန်ုပ်၏ တောင်းဆိုမှုများ"}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:bg-secondary"
            aria-label="Toggle language"
          >
            {lang === "en" ? "မြန်မာ" : "EN"}
          </button>
          {user ? (
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => signOut()}
            >
              {lang === "en" ? "Sign out" : "ထွက်ရန်"}
            </Button>
          ) : (
            <Link to="/signin" className="hidden sm:block">
              <Button variant="ghost" size="sm">{t("nav_signin")}</Button>
            </Link>
          )}
          <Link to="/request/new" className="hidden md:block">
            <Button size="sm">{lang === "en" ? "Request service" : "ဝန်ဆောင်မှု တောင်းဆိုရန်"}</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
