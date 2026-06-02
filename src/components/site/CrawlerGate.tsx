import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";

const STORAGE_KEY = "fx_gate_ok";
const USER = "admin";
const PASS = "fx@123";

const PUBLIC_BYPASS_PATHS = ["/auth/confirm", "/reset-password"];

export function CrawlerGate({
  children,
  pathname,
}: {
  children: React.ReactNode;
  pathname?: string;
}) {
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const bypassGate = useMemo(
    () => PUBLIC_BYPASS_PATHS.some((path) => pathname === path || pathname?.startsWith(`${path}/`)),
    [pathname],
  );
  const [lang, setLang] = useState<"en" | "my">("en");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("lang");
      if (saved === "en" || saved === "my") setLang(saved);
    } catch {
      /* ignore */
    }
  }, []);
  const L = (en: string, my: string) => (lang === "en" ? en : my);

  if (bypassGate) {
    return <>{children}</>;
  }

  useEffect(() => {
    try {
      setUnlocked(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  if (!ready) return null;

  if (!unlocked) {
    const onSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (u.trim() === USER && p === PASS) {
        try {
          localStorage.setItem(STORAGE_KEY, "1");
        } catch {
          /* ignore */
        }
        setUnlocked(true);
      } else {
        setErr(L("Invalid credentials", "အကောင့် သို့မဟုတ် စကားဝှက် မမှန်ပါ"));
      }
    };
    return (
      <>
        <meta name="robots" content="noindex, nofollow" />
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <form
            onSubmit={onSubmit}
            className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft"
          >
            <div className="text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Lock className="h-5 w-5" />
              </div>
              <h1 className="mt-3 text-lg font-bold">{L("Restricted", "ဝင်ခွင့်ကန့်သတ်ထား")}</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                {L("Sign in to access this site.", "ဆိုက်ကို ဝင်ရောက်ရန် ဝင်ရောက်ပါ။")}
              </p>
            </div>
            <Input
              autoFocus
              placeholder={L("Username", "အသုံးပြုသူ အမည်")}
              value={u}
              onChange={(e) => setU(e.target.value)}
              className="h-11"
              autoComplete="off"
            />
            <Input
              type="password"
              placeholder={L("Password", "စကားဝှက်")}
              value={p}
              onChange={(e) => setP(e.target.value)}
              className="h-11"
              autoComplete="off"
            />
            {err && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                {err}
              </p>
            )}
            <Button type="submit" className="h-11 w-full rounded-xl font-semibold">
              {L("Enter", "ဝင်ရောက်")}
            </Button>
          </form>
        </div>
      </>
    );
  }

  return <>{children}</>;
}
