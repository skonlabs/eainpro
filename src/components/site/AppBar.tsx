import { Link, useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { NotificationBell } from "@/components/site/NotificationBell";
import { CreditsBadge } from "@/components/provider/CreditsBadge";
import logoUrl from "@/assets/logo.png";

// Routes that act as tab roots — no back button on these.
const TAB_ROOTS = new Set([
  "/",
  "/services",
  "/providers",
  "/my-requests",
  "/account",
  "/provider/dashboard",
  "/admin",
]);

// Routes that own their own back/exit affordance — the global AppBar should
// not render a second back button on these.
const NO_BACK_ROUTES = new Set<string>(["/request/new", "/guided"]);

// Sensible parent fallbacks when there's no browser history (e.g. user opened
// a deep link directly). Keep these in sync with TAB_ROOTS above.
function parentFor(pathname: string): string {
  if (pathname.startsWith("/services/")) return "/services";
  if (pathname.startsWith("/p/")) return "/providers";
  if (pathname.startsWith("/request/new")) return "/";
  if (pathname.startsWith("/request/")) return "/my-requests";
  if (pathname === "/provider/onboarding") return "/account";
  if (pathname === "/guided") return "/";
  if (pathname === "/signup" || pathname === "/reset-password") return "/signin";
  if (pathname === "/signin") return "/";
  return "/";
}

const TITLES: Record<string, { en: string; my: string }> = {
  "/": { en: "Home", my: "ပင်မ" },
  "/services": { en: "Services", my: "ဝန်ဆောင်မှု" },
  "/providers": { en: "Pros", my: "ပညာရှင်များ" },
  "/my-requests": { en: "My Requests", my: "ကျွန်ုပ်၏ တောင်းဆို" },
  "/account": { en: "Account", my: "အကောင့်" },
  "/request/new": { en: "New Request", my: "တောင်းဆို အသစ်" },
  "/provider/dashboard": { en: "Jobs", my: "အလုပ်" },
  "/provider/onboarding": { en: "Get Started", my: "စတင်ရန်" },
  "/admin": { en: "Admin", my: "Admin" },
  "/signin": { en: "Sign in", my: "ဝင်ရောက်" },
  "/signup": { en: "Sign up", my: "အကောင့်ဖွင့်" },
  "/reset-password": { en: "Reset Password", my: "လျှို့ဝှက်နံပါတ်ပြန်" },
  "/guided": { en: "Help Me Choose", my: "ကူညီပေးမည်" },
};

function titleFor(pathname: string, lang: "en" | "my") {
  if (TITLES[pathname]) return TITLES[pathname][lang];
  // dynamic routes
  if (pathname.startsWith("/services/")) return lang === "en" ? "Service" : "ဝန်ဆောင်မှု";
  if (pathname.startsWith("/p/")) return lang === "en" ? "Provider" : "ပညာရှင်";
  if (pathname.startsWith("/request/")) return lang === "en" ? "Job" : "အလုပ်";
  return "Fixido";
}

export function AppBar() {
  const { lang, setLang } = useI18n();
  const { user, roles } = useAuth();
  const isProvider = roles.includes("provider");
  const { pathname } = useLocation();
  const router = useRouter();
  const navigate = useNavigate();

  const isRoot = TAB_ROOTS.has(pathname);
  const hideBack = NO_BACK_ROUTES.has(pathname);
  const title = titleFor(pathname, lang);
  const isFullBleed = pathname === "/admin" || pathname.startsWith("/admin/");

  const goBack = () => {
    // If there's prior history within this session, use it; otherwise fall
    // back to a sensible parent route so deep links don't strand users.
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      navigate({ to: parentFor(pathname) });
    }
  };

  return (
    <header
      className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/90 backdrop-blur-xl"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div
        className={
          isFullBleed
            ? "flex h-14 w-full items-center gap-2 px-3 sm:px-4"
            : "mx-auto flex h-14 max-w-screen-md items-center gap-2 px-3 sm:px-4"
        }
      >
        {isRoot || hideBack ? (
          <Link to="/" className="flex items-center gap-2">
            <img
              src={logoUrl}
              alt="Fixido"
              className="h-9 w-9"
            />
            <span className="font-display text-lg font-extrabold tracking-tight">Fixido</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={goBack}
            aria-label="Back"
            className="grid h-10 w-10 place-items-center rounded-full text-foreground/80 hover:bg-secondary"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        <h1 className="flex-1 truncate font-display text-lg font-extrabold tracking-tight">
          {isRoot || hideBack ? "" : title}
        </h1>

        {isProvider && <CreditsBadge size="sm" compact />}
        <button
          onClick={() => setLang(lang === "en" ? "my" : "en")}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm font-semibold text-foreground hover:bg-secondary"
          aria-label={lang === "en" ? "Switch to Burmese" : "Switch to English"}
          title={lang === "en" ? "Switch to Burmese" : "Switch to English"}
        >
          <span aria-hidden className="text-base leading-none">
            {lang === "en" ? "🇲🇲" : "🇬🇧"}
          </span>
          <span className="text-xs">
            {lang === "en" ? "မြန်မာ" : "English"}
          </span>
        </button>
        {user && <NotificationBell />}
      </div>
    </header>
  );
}
