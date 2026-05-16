import { useI18n } from "@/lib/i18n";

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mt-24 border-t border-border/60 bg-secondary/40">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-base font-semibold">{t("brand")}</div>
            <p className="mt-1 text-sm text-muted-foreground">{t("tagline")}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {t("brand")}. {t("footer_rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}