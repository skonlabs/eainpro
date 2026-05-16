import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export function Header() {
  const { t, lang, setLang } = useI18n();
  const toggle = () => setLang(lang === "en" ? "my" : "en");

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground font-bold">
            E
          </div>
          <span className="text-lg font-semibold tracking-tight">{t("brand")}</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link to="/services" className="text-foreground/80 hover:text-foreground">
            {t("nav_services")}
          </Link>
          <Link to="/providers" className="text-foreground/80 hover:text-foreground">
            {t("nav_providers")}
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-secondary"
            aria-label="Toggle language"
          >
            {lang === "en" ? "မြန်မာ" : "EN"}
          </button>
          <Link to="/signin" className="hidden sm:block">
            <Button variant="ghost" size="sm">{t("nav_signin")}</Button>
          </Link>
          <Link to="/post-job">
            <Button size="sm">{t("nav_post")}</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
