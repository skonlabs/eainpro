import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
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
  const queryClient = useQueryClient();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [sessionReady, setSessionReady] = useState(false);
  const [rolesReady, setRolesReady] = useState(false);
  const lastResolvedAuthState = useRef<string | undefined>(undefined);
  const lastSessionKey = useRef<string | undefined>(undefined);
  const suppressAuthEventsRef = useRef(false);

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
    let active = true;

    const apply = async (s: Session | null) => {
      if (!active) return;

      const nextKey = `${s?.user?.id ?? "guest"}|${s?.access_token ?? ""}`;
      if (lastSessionKey.current === nextKey) {
        setSessionReady(true);
        if (!s?.user) setRolesReady(true);
        return;
      }

      lastSessionKey.current = nextKey;
      setSession(s);
      setSessionReady(true);
      await loadRoles(s?.user?.id);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((e, s) => {
      if (suppressAuthEventsRef.current && e !== "SIGNED_OUT" && s) return;
      if (e === "SIGNED_OUT") {
        suppressAuthEventsRef.current = false;
        lastSessionKey.current = "guest|";
      }
      void apply(s);
    });

    // Cross-tab safety: if another tab clears the auth token, drop session here.
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === SUPABASE_AUTH_STORAGE_KEY && !ev.newValue) {
        suppressAuthEventsRef.current = false;
        lastSessionKey.current = "guest|";
        setSession(null);
        setSessionReady(true);
        setRoles([]);
        setRolesReady(true);
      }
    };
    if (typeof window !== "undefined")
      window.addEventListener("storage", onStorage);

    supabase.auth.getSession().then(({ data }) => {
      void apply(data.session);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
      if (typeof window !== "undefined")
        window.removeEventListener("storage", onStorage);
    };
  }, []);

  const userId = session?.user?.id ?? null;
  const user = useMemo(() => session?.user ?? null, [userId]); // eslint-disable-line react-hooks/exhaustive-deps
  const loading = !sessionReady || !rolesReady;

  useEffect(() => {
    if (!sessionReady || !rolesReady) return;

    const nextAuthState = `${session?.user?.id ?? "guest"}|${[...roles].sort().join(",")}`;
    if (lastResolvedAuthState.current === undefined) {
      lastResolvedAuthState.current = nextAuthState;
      return;
    }
    if (lastResolvedAuthState.current === nextAuthState) return;
    lastResolvedAuthState.current = nextAuthState;

    void (async () => {
      await queryClient.cancelQueries();
      if (session?.user) {
        await queryClient.invalidateQueries();
      } else {
        queryClient.clear();
      }
      await router.invalidate();
    })();
  }, [queryClient, roles, rolesReady, router, session?.user, sessionReady]);

  const value: AuthCtx = useMemo(
    () => ({
      user,
      session,
      roles,
      loading,
      rolesReady,
      signOut: async () => {
        // Optimistically clear local state.
        suppressAuthEventsRef.current = true;
        lastSessionKey.current = "guest|";
        setSession(null);
        setSessionReady(true);
        setRoles([]);
        setRolesReady(true);
        await queryClient.cancelQueries();
        queryClient.clear();
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
        await router.invalidate();
        await router.navigate({ to: "/", replace: true });
      },
      refreshRoles: () => loadRoles(session?.user?.id),
    }),
    [user, session, roles, loading, rolesReady, queryClient, router],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
