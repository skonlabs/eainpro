import { useEffect, useMemo } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth, type AppRole } from "@/lib/auth";
import { toast } from "sonner";

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

    // Not allowed: block access and send the user to a role-appropriate home.
    // Never auto-redirect into another restricted area (e.g. customers must
    // not be funnelled into /provider/onboarding just by visiting a provider URL).
    toast.error("You don't have access to that page.");

    if (requiredRoles.includes("admin")) {
      nav({
        to: roles.includes("provider") ? "/provider/dashboard" : "/",
        replace: true,
      });
      return;
    }
    if (requiredRoles.includes("provider")) {
      nav({
        to: roles.includes("admin") ? "/admin" : "/",
        replace: true,
      });
      return;
    }
    if (requiredRoles.includes("customer")) {
      nav({
        to: roles.includes("admin")
          ? "/admin"
          : roles.includes("provider")
            ? "/provider/dashboard"
            : "/",
        replace: true,
      });
      return;
    }
    nav({ to: "/", replace: true });
  }, [checking, user, allowed, nav, pathname, roles, requiredRoles]);

  return { checking, allowed };
}