import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

export function Footer() {
  const { t, lang } = useI18n();
  const L = (en: string, my: string) => (lang === "en" ? en : my);
  return (
    <footer className="border-t border-border/60 bg-secondary/40">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-[1fr_auto_auto]">
          <div>
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground text-sm font-extrabold shadow">
                E
              </div>
              <span className="text-base font-bold">{t("brand")}</span>
            </div>
            <p className="mt-2 max-w-xs text-xs text-muted-foreground leading-relaxed">{t("tagline")}</p>
          </div>
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
              {L("For customers", "ဖောက်သည်များ")}
            </div>
            <nav className="flex flex-col gap-1.5 text-sm">
              <Link to="/services" className="text-muted-foreground hover:text-foreground">{t("nav_services")}</Link>
              <Link to="/providers" search={{ cat: "", city: "" }} className="text-muted-foreground hover:text-foreground">{t("nav_providers")}</Link>
              <Link to="/request/new" className="text-muted-foreground hover:text-foreground">{L("Request a service", "ဝန်ဆောင်မှု တောင်းရန်")}</Link>
              <Link to="/guided" className="text-muted-foreground hover:text-foreground">{L("Help me choose", "ကူညီပေးပါ")}</Link>
            </nav>
          </div>
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
              {L("For providers", "ဝန်ဆောင်မှုပေးသူ")}
            </div>
            <nav className="flex flex-col gap-1.5 text-sm">
              <Link to="/signup" search={{ as: "provider" }} className="text-muted-foreground hover:text-foreground">{t("cta_join")}</Link>
              <Link to="/provider/onboarding" className="text-muted-foreground hover:text-foreground">{L("Set up profile", "ပရိုဖိုင် ပြင်ဆင်")}</Link>
              <Link to="/provider/dashboard" className="text-muted-foreground hover:text-foreground">{L("View jobs", "အလုပ်ကြည့်")}</Link>
            </nav>
          </div>
        </div>
        <div className="mt-8 border-t border-border/40 pt-5 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {t("brand")}. {t("footer_rights")}
        </div>
      </div>
    </footer>
  );
}