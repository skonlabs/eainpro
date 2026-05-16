// Only allow same-origin path redirects (must start with "/" but not "//").
export function safeRedirect(path: string | undefined | null, fallback = "/"): string {
  if (!path) return fallback;
  if (!path.startsWith("/") || path.startsWith("//")) return fallback;
  return path;
}
