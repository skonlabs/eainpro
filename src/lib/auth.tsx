import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, SUPABASE_AUTH_STORAGE_KEY } from "@/lib/supabase";

export type AppRole = "customer" | "provider" | "admin";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  rolesReady: boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [sessionReady, setSessionReady] = useState(false);
  const [rolesReady, setRolesReady] = useState(false);

  const loadRoles = async (userId: string | undefined): Promise<void> => {
    setRolesReady(false);
    if (!userId) {
      setRoles([]);
      setRolesReady(true);
      return;
    }
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      setRoles((data ?? []).map((r) => r.role as AppRole));
    } finally {
      setRolesReady(true);
    }
  };

  useEffect(() => {
    let lastUserId: string | null | undefined = undefined;
    let lastToken: string | null | undefined = undefined;
    let signedOut = false;

    const apply = (s: Session | null) => {
      // Once the tab has explicitly signed out, ignore any late-arriving
      // SIGNED_IN / TOKEN_REFRESHED events so an old user can't rehydrate.
      if (signedOut && s) return;
      const nextUserId = s?.user?.id ?? null;
      const nextToken = s?.access_token ?? null;
      if (nextUserId === lastUserId && nextToken === lastToken) return;
      const userChanged = nextUserId !== lastUserId;
      lastUserId = nextUserId;
      lastToken = nextToken;
      setSession(s);
      if (userChanged) {
        setTimeout(() => {
          loadRoles(nextUserId ?? undefined);
        }, 0);
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === "SIGNED_IN") signedOut = false;
      if (e === "SIGNED_OUT") {
        signedOut = true;
        lastUserId = null;
        lastToken = null;
      }
      apply(s);
    });

    // Cross-tab safety: if another tab clears the auth token, drop session here.
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === SUPABASE_AUTH_STORAGE_KEY && !ev.newValue) {
        signedOut = true;
        lastUserId = null;
        lastToken = null;
        setSession(null);
        setRoles([]);
        setRolesReady(true);
      }
    };
    if (typeof window !== "undefined")
      window.addEventListener("storage", onStorage);

    supabase.auth.getSession().then(({ data }) => {
      apply(data.session);
      setSessionReady(true);
    });

    return () => {
      sub.subscription.unsubscribe();
      if (typeof window !== "undefined")
        window.removeEventListener("storage", onStorage);
    };
  }, []);

  const userId = session?.user?.id ?? null;
  const user = useMemo(() => session?.user ?? null, [userId]); // eslint-disable-line react-hooks/exhaustive-deps
  const loading = !sessionReady || !rolesReady;

  const value: AuthCtx = useMemo(
    () => ({
      user,
      session,
      roles,
      loading,
      rolesReady,
      signOut: async () => {
        // Optimistically clear local state.
        setSession(null);
        setRoles([]);
        setRolesReady(true);
        // scope: "local" — "global" silently fails (without clearing local
        // storage) when the access token is already expired.
        try {
          await supabase.auth.signOut({ scope: "local" });
        } catch {
          /* ignore */
        }
        // Wipe any lingering supabase auth tokens so a stale entry (or a
        // late TOKEN_REFRESHED write) can't auto-rehydrate the session.
        try {
          if (typeof window !== "undefined") {
            const keys: string[] = [];
            for (let i = 0; i < window.localStorage.length; i++) {
              const k = window.localStorage.key(i);
              if (k && (k.startsWith("sb-") || k.includes("supabase.auth"))) {
                keys.push(k);
              }
            }
            keys.forEach((k) => window.localStorage.removeItem(k));
            try {
              window.sessionStorage.clear();
            } catch {
              /* ignore */
            }
          }
        } catch {
          /* ignore */
        }
        // Hard reload to home — guarantees no in-memory cache / route loader
        // keeps the old user's data on screen.
        if (typeof window !== "undefined") {
          window.location.replace("/");
        }
      },
      refreshRoles: () => loadRoles(session?.user?.id),
    }),
    [user, session, roles, loading, rolesReady],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
