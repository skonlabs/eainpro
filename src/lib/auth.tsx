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
    // Listener FIRST (per Supabase guidance), then getSession.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      // Defer Supabase calls outside the callback to avoid deadlocks.
      setTimeout(() => {
        loadRoles(s?.user?.id);
      }, 0);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadRoles(data.session?.user?.id).finally(() => setLoading(false));
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthCtx = useMemo(
    () => ({
      user: session?.user ?? null,
      session,
      roles,
      loading,
      rolesReady,
      signOut: async () => {
        await supabase.auth.signOut();
      },
      refreshRoles: () => loadRoles(session?.user?.id),
    }),
    [session, roles, loading, rolesReady],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}