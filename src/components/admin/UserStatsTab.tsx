import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type Bucket = { last_7: number; prev_7: number; last_30: number; prev_30: number };
type RoleSplit = { customers: Bucket; providers: Bucket };
type Stats = {
  totals: { customers: number; providers: number };
  dau: RoleSplit;
  new_users: RoleSplit;
  daily: { day: string; customers: number; providers: number }[];
};

function pctChange(curr: number, prev: number): { text: string; tone: "up" | "down" | "flat" } {
  const c = Number(curr ?? 0);
  const p = Number(prev ?? 0);
  if (p === 0) {
    if (c === 0) return { text: "—", tone: "flat" };
    return { text: "+∞%", tone: "up" };
  }
  const pct = ((c - p) / p) * 100;
  const tone = pct > 0.5 ? "up" : pct < -0.5 ? "down" : "flat";
  const sign = pct > 0 ? "+" : "";
  return { text: `${sign}${pct.toFixed(1)}%`, tone };
}

function fmtNum(n: number) {
  return Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function MetricRow({
  label,
  curr,
  prev,
  suffix,
}: { label: string; curr: number; prev: number; suffix?: string }) {
  const ch = pctChange(curr, prev);
  const toneClass =
    ch.tone === "up" ? "text-emerald-600" : ch.tone === "down" ? "text-rose-600" : "text-muted-foreground";
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-border py-2 first:border-t-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-base font-semibold tabular-nums">{fmtNum(curr)}{suffix}</span>
        <span className={`text-xs font-medium ${toneClass}`}>{ch.text}</span>
        <span className="text-[10px] text-muted-foreground tabular-nums">vs {fmtNum(prev)}</span>
      </div>
    </div>
  );
}

function ReportCard({
  title, subtitle, split, kind,
}: { title: string; subtitle: string; split: RoleSplit; kind: "dau" | "new" }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <header className="mb-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {(["customers", "providers"] as const).map((role) => {
          const b = split[role];
          const roleLabel = role === "customers" ? "Homeowners" : "Providers";
          return (
            <div key={role} className="rounded-xl border border-border bg-background p-3">
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {roleLabel}
              </div>
              <MetricRow
                label={kind === "dau" ? "Avg DAU — last 7d (WoW)" : "New — last 7d (WoW)"}
                curr={b.last_7} prev={b.prev_7}
              />
              <MetricRow
                label={kind === "dau" ? "Avg DAU — last 30d (MoM)" : "New — last 30d (MoM)"}
                curr={b.last_30} prev={b.prev_30}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function UserStatsTab() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_admin_user_stats");
      if (error) {
        toast.error(error.message);
        setStats({
          totals: { customers: 0, providers: 0 },
          dau: { customers: { last_7: 0, prev_7: 0, last_30: 0, prev_30: 0 }, providers: { last_7: 0, prev_7: 0, last_30: 0, prev_30: 0 } },
          new_users: { customers: { last_7: 0, prev_7: 0, last_30: 0, prev_30: 0 }, providers: { last_7: 0, prev_7: 0, last_30: 0, prev_30: 0 } },
          daily: [],
        });
        return;
      }
      setStats(data as unknown as Stats);
    })();
  }, []);

  if (!stats) return <Skeleton className="mt-4 h-64 w-full" />;

  const maxDaily = Math.max(
    1,
    ...stats.daily.map((d) => Number(d.customers) + Number(d.providers)),
  );

  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-2xl font-bold">{fmtNum(stats.totals.customers)}</div>
          <div className="text-xs text-muted-foreground">Total homeowners</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-2xl font-bold">{fmtNum(stats.totals.providers)}</div>
          <div className="text-xs text-muted-foreground">Total providers</div>
        </div>
      </div>

      <ReportCard
        title="Daily active users"
        subtitle="Average distinct users active per day, by role"
        split={stats.dau}
        kind="dau"
      />
      <ReportCard
        title="New users"
        subtitle="Sign-ups by role"
        split={stats.new_users}
        kind="new"
      />

      <section className="rounded-2xl border border-border bg-card p-4">
        <header className="mb-3">
          <h3 className="text-sm font-semibold">Last 30 days — DAU</h3>
          <p className="text-xs text-muted-foreground">Homeowners (primary) + Providers stacked</p>
        </header>
        {stats.daily.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ul className="space-y-1">
            {stats.daily.map((d) => {
              const total = Number(d.customers) + Number(d.providers);
              const widthPct = Math.round((total / maxDaily) * 100);
              const custPct = total === 0 ? 0 : Math.round((Number(d.customers) / total) * 100);
              return (
                <li key={d.day} className="flex items-center gap-3 text-xs">
                  <span className="w-20 shrink-0 tabular-nums text-muted-foreground">
                    {new Date(d.day).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="flex h-full" style={{ width: `${widthPct}%` }}>
                      <div className="h-full bg-primary" style={{ width: `${custPct}%` }} />
                      <div className="h-full bg-amber-500" style={{ width: `${100 - custPct}%` }} />
                    </div>
                  </div>
                  <span className="w-24 shrink-0 text-right tabular-nums">
                    <span className="text-primary">{d.customers}</span>
                    {" / "}
                    <span className="text-amber-600">{d.providers}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-3 flex items-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" /> Homeowners
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Providers
          </span>
        </div>
      </section>
    </div>
  );
}