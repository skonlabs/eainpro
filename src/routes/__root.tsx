import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { BottomNav } from "@/components/site/BottomNav";
import { AppBar } from "@/components/site/AppBar";
import { BlockedBanner } from "@/components/site/BlockedBanner";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { CrawlerGate } from "@/components/site/CrawlerGate";

function NotFoundComponent() {
  const { lang } = useI18n();
  const L = (en: string, my: string) => (lang === "en" ? en : my);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{L("Page not found", "စာမျက်နှာ မတွေ့ပါ")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {L("The page you're looking for doesn't exist or has been moved.", "သင်ရှာနေသော စာမျက်နှာ မရှိပါ သို့မဟုတ် ရွှေ့ပြောင်းသွားပါပြီ။")}
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {L("Go home", "ပင်မသို့ ပြန်")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const { lang } = useI18n();
  const L = (en: string, my: string) => (lang === "en" ? en : my);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {L("This page didn't load", "ဤ စာမျက်နှာ တင်မရပါ")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {L("Something went wrong on our end. You can try refreshing or head back home.", "ကျွန်ုပ်တို့ဘက်တွင် အမှားတစ်ခု ဖြစ်ပေါ်ခဲ့သည်။ ပြန်လည် ကြိုးစားကြည့်ပါ သို့မဟုတ် ပင်မသို့ ပြန်ပါ။")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {L("Try again", "ပြန်ကြိုးစား")}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {L("Go home", "ပင်မသို့ ပြန်")}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover",
      },
      { name: "theme-color", content: "#0c5b5f" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      {
        name: "apple-mobile-web-app-status-bar-style",
        content: "default",
      },
      { title: "Fixido — Trusted home services in Myanmar" },
      { name: "description", content: "Book trusted cleaners, plumbers, electricians, AC technicians, painters and movers in Yangon, Mandalay and across Myanmar." },
      { name: "author", content: "Fixido" },
      { property: "og:title", content: "Fixido — Trusted home services in Myanmar" },
      { property: "og:description", content: "Book trusted cleaners, plumbers, electricians, AC technicians, painters and movers in Yangon, Mandalay and across Myanmar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Fixido — Trusted home services in Myanmar" },
      { name: "twitter:description", content: "Book trusted cleaners, plumbers, electricians, AC technicians, painters and movers in Yangon, Mandalay and across Myanmar." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/76913998-118d-4ec0-820f-1886f7f63905/id-preview-f1b082f0--b2445c85-f613-46a5-a1e1-eb965ed41336.lovable.app-1779297128625.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/76913998-118d-4ec0-820f-1886f7f63905/id-preview-f1b082f0--b2445c85-f613-46a5-a1e1-eb965ed41336.lovable.app-1779297128625.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Manrope:wght@400;500;600;700&family=Noto+Sans+Myanmar:wght@400;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isFullBleed = pathname === "/admin" || pathname.startsWith("/admin/");
  return (
    <QueryClientProvider client={queryClient}>
      <CrawlerGate pathname={pathname}>
      <AuthProvider>
        <I18nProvider>
          <div className="flex min-h-screen flex-col bg-background">
            <AppBar />
            <BlockedBanner />
            <main
              className={
                isFullBleed
                  ? "flex-1 w-full"
                  : "mx-auto w-full max-w-screen-md flex-1 px-3 pb-24 pt-3 sm:px-4"
              }
            >
              <Outlet />
            </main>
          </div>
          <BottomNav />
          <Toaster position="top-center" richColors />
        </I18nProvider>
      </AuthProvider>
       </CrawlerGate>
    </QueryClientProvider>
  );
}
