import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

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
  // loading = true until the initial session check + roles fetch both complete.
  // rolesReady tracks whether the roles slice is current for the active session.
  const [loading, setLoading] = useState(true);
  const [rolesReady, setRolesReady] = useState(false);

  const loadRoles = async (userId: string | undefined): Promise<void> => {
    setRolesReady(false);
    if (!userId) {
      setRoles([]);
      setRolesReady(true);
      return;
    }
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    setRoles((data ?? []).map((r) => r.role as AppRole));
    setRolesReady(true);
  };

  useEffect(() => {
    let lastUserId: string | null | undefined = undefined;
    let lastToken: string | null | undefined = undefined;

    const apply = (s: Session | null) => {
      const nextUserId = s?.user?.id ?? null;
      const nextToken = s?.access_token ?? null;
      // Skip no-op updates so consumers don't re-render / re-fetch when
      // Supabase emits INITIAL_SESSION + TOKEN_REFRESHED with the same user.
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

    // Listener FIRST (per Supabase guidance), then getSession.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => apply(s));

    supabase.auth.getSession().then(({ data }) => {
      apply(data.session);
      loadRoles(data.session?.user?.id).finally(() => setLoading(false));
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Stabilise the user reference: only change identity when the user id flips.
  const userId = session?.user?.id ?? null;
  const user = useMemo(() => session?.user ?? null, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const value: AuthCtx = useMemo(
    () => ({
      user,
      session,
      roles,
      loading,
      rolesReady,
      signOut: async () => {
        await supabase.auth.signOut();
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