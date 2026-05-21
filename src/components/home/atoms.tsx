import { Link } from "@tanstack/react-router";
import {
  Plus,
  Sparkles,
  Wrench,
  Plug,
  Snowflake,
  PaintBucket,
  Truck,
  Bug,
  Hammer,
  Sofa,
  Refrigerator,
  Droplets,
  Zap,
  Camera,
  Wifi,
  Lock,
  Trees,
  Shirt,
} from "lucide-react";

export type Lang = "en" | "my";
export type Lfn = (en: string, my: string) => string;

export const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles, Wrench, Plug, Snowflake, PaintBucket, Truck, Bug, Hammer, Sofa,
  Refrigerator, Droplets, Zap, Camera, Wifi, Lock, Trees, Shirt,
  Saw: Hammer, Brick: Hammer,
};

export function Greeting({ name, sub }: { name: string; sub: string }) {
  return (
    <div className="relative overflow-hidden rounded-3xl p-5 text-primary-foreground shadow-lg shadow-primary/20" style={{ background: "var(--gradient-hero)" }}>
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="relative">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary-foreground/70">Hi</div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{name}</h1>
        <p className="mt-1 text-sm text-primary-foreground/85">{sub}</p>
      </div>
    </div>
  );
}

export function HeroCard({
  eyebrow, name, sub, ctaTo, ctaSearch, ctaLabel, ctaHint,
}: {
  eyebrow: string;
  name: string;
  sub: string;
  ctaTo: string;
  ctaSearch?: Record<string, string>;
  ctaLabel: string;
  ctaHint: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl p-5 text-primary-foreground shadow-xl shadow-primary/25"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-[color:var(--accent)]/30 blur-3xl" />
      <div className="relative">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary-foreground/70">{eyebrow}</div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{name}</h1>
        <p className="mt-1 max-w-sm text-sm text-primary-foreground/85">{sub}</p>
        <Link
          to={ctaTo as "/"}
          search={ctaSearch as Record<string, never>}
          className="mt-4 flex items-center justify-between rounded-2xl bg-white/95 px-4 py-3 text-foreground shadow-md transition active:scale-[0.99]"
        >
          <div>
            <div className="text-sm font-bold tracking-tight">{ctaLabel}</div>
            <div className="text-[11px] text-muted-foreground">{ctaHint}</div>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/40">
            <Plus className="h-5 w-5" />
          </span>
        </Link>
      </div>
    </div>
  );
}

export function SectionHeader({
  title, badge, link,
}: {
  title: string;
  badge?: number;
  link?: { to: string; label: string };
}) {
  return (
    <div className="mb-2 flex items-center justify-between px-1">
      <h2 className="flex items-center gap-2 text-sm font-bold tracking-tight">
        {title}
        {badge !== undefined && badge > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
            {badge}
          </span>
        )}
      </h2>
      {link && (
        <Link to={link.to} className="text-xs font-semibold text-primary">
          {link.label}
        </Link>
      )}
    </div>
  );
}

export function StatTile({
  icon, label, value, sub, to,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  to?: string;
}) {
  const content = (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <div className="text-xl font-extrabold tracking-tight">{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
  if (to) return <Link to={to}>{content}</Link>;
  return content;
}

export function ActionRow({
  to, params, search, icon, tone, title, sub, cta,
}: {
  to: string;
  params?: Record<string, string>;
  search?: Record<string, string>;
  icon: React.ReactNode;
  tone: "amber" | "primary" | "emerald";
  title: string;
  sub: string;
  cta: string;
}) {
  const toneClasses =
    tone === "amber"
      ? "border-amber-500/40 bg-amber-500/5"
      : tone === "emerald"
        ? "border-emerald-500/40 bg-emerald-500/5"
        : "border-primary/40 bg-primary/5";
  const iconClasses =
    tone === "amber"
      ? "bg-amber-500/15 text-amber-700"
      : tone === "emerald"
        ? "bg-emerald-500/15 text-emerald-700"
        : "bg-primary/15 text-primary";
  return (
    <li>
      <Link
        to={to}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        params={params as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        search={search as any}
        className={`flex items-center gap-3 rounded-2xl border p-3 transition hover:border-foreground/30 ${toneClasses}`}
      >
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${iconClasses}`}>{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{title}</div>
          {sub && <div className="truncate text-xs text-muted-foreground">{sub}</div>}
        </div>
        <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-foreground shadow-sm">
          {cta}
        </span>
      </Link>
    </li>
  );
}

export function QuickAction({
  to, icon, title, sub,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition hover:border-primary/50"
    >
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{title}</div>
        <div className="truncate text-[11px] text-muted-foreground">{sub}</div>
      </div>
    </Link>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tint: Record<string, string> = {
    open: "bg-amber-500/15 text-amber-700",
    quoted: "bg-sky-500/15 text-sky-700",
    accepted: "bg-emerald-500/15 text-emerald-700",
    in_progress: "bg-violet-500/15 text-violet-700",
    completed: "bg-muted text-muted-foreground",
    cancelled: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${tint[status] ?? "bg-muted text-muted-foreground"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

export function Loading({ L }: { L: Lfn }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
      {L("Loading…", "ခဏစောင့်ပါ…")}
    </div>
  );
}

export function Empty({
  icon, title, sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-5 text-center">
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="mt-2 text-sm font-semibold">{title}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}