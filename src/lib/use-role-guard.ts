import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth, type AppRole } from "@/lib/auth";

type Options = {
  /** Where to send a signed-in user who lacks the required role. */
  fallback?: string;
};

/**
 * Gate a route to one or more roles.
 * - Unauthenticated users are sent to /signin with the current path saved.
 * - Signed-in users without any of the required roles are redirected to a
 *   role-appropriate landing page (provider → onboarding, admin → home,
 *   customer → provider dashboard / admin) unless `fallback` is provided.
 */
export function useRoleGuard(
  required: AppRole | AppRole[],
  opts: Options = {},
) {
  const { user, roles, loading, rolesReady } = useAuth();
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const requiredRoles = Array.isArray(required) ? required : [required];

  const checking = loading || !rolesReady;
  const allowed = !!user && requiredRoles.some((r) => roles.includes(r));

  useEffect(() => {
    if (checking) return;
    if (!user) {
      nav({ to: "/signin", search: { redirect: pathname }, replace: true });
      return;
    }
    if (allowed) return;

    if (opts.fallback) {
      nav({ to: opts.fallback, replace: true });
      return;
    }

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
  }, [checking, user, allowed, nav, pathname, roles, requiredRoles, opts.fallback]);

  return { checking, allowed };
}