import { useEffect, useMemo } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth, type AppRole } from "@/lib/auth";

/**
 * Gate a route to one or more roles.
 * - Unauthenticated users are sent to /signin with the current path saved.
 * - Signed-in users without any of the required roles are redirected to a
 *   role-appropriate landing page (provider → onboarding, admin → home,
 *   customer → provider dashboard / admin).
 */
export function useRoleGuard(required: AppRole | AppRole[]) {
  const { user, roles, loading, rolesReady } = useAuth();
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const requiredRoles = useMemo(
    () => (Array.isArray(required) ? required : [required]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Array.isArray(required) ? required.join(",") : required],
  );

  const checking = loading || !rolesReady;
  const allowed = !!user && requiredRoles.some((r) => roles.includes(r));

  useEffect(() => {
    if (checking) return;
    if (!user) {
      nav({ to: "/signin", search: { redirect: pathname }, replace: true });
      return;
    }
    if (allowed) return;

    // Pick a sensible destination based on what the user actually is.
    if (requiredRoles.includes("admin")) {
      nav({ to: "/", replace: true });
      return;
    }
    if (requiredRoles.includes("provider")) {
      // Customer trying to view a provider page → start onboarding.
      // Admin-only account → home.
      nav({ to: roles.includes("admin") ? "/" : "/provider/onboarding", replace: true });
      return;
    }
    if (requiredRoles.includes("customer")) {
      // Provider/admin trying to view a customer page → their own home.
      nav({
        to: roles.includes("admin") ? "/admin" : "/provider/dashboard",
        replace: true,
      });
      return;
    }
    nav({ to: "/", replace: true });
  }, [checking, user, allowed, nav, pathname, roles, requiredRoles]);

  return { checking, allowed };
}