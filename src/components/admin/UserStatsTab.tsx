import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

type Bucket = { last_7: number; prev_7: number; last_30: number; prev_30: number };
type RoleSplit = { customers: Bucket; providers: Bucket };
type DailyRow = { day: string; customers: number; providers: number };
type Stats = {
  totals: { customers: number; providers: number };
  dau: RoleSplit;
  new_users: RoleSplit;
  daily: DailyRow[];
  new_daily?: DailyRow[];
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

// Use raw token values. hsl(var(--primary)) is invalid because --primary
// is defined as oklch(...), so recharts was falling back to its defaults
// and the line color drifted away from the bar color.
const COLOR_CUST = "var(--primary)";
const COLOR_PROV = "hsl(35 92% 50%)";

function shortDay(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function TrendChart({
  data,
  kind,
}: {
  data: DailyRow[];
  kind: "line" | "bar";
}) {
  const rows = data.map((d) => ({ ...d, day: shortDay(d.day) }));
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {kind === "line" ? (
          <LineChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
              labelStyle={{ fontWeight: 600 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="customers"
              name="Homeowners"
              stroke={COLOR_CUST}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="providers"
              name="Providers"
              stroke={COLOR_PROV}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        ) : (
          <BarChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="customers" name="Homeowners" fill={COLOR_CUST} radius={[4, 4, 0, 0]} />
            <Bar dataKey="providers" name="Providers" fill={COLOR_PROV} radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
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
  title, subtitle, split, kind, series, chartKind,
}: {
  title: string;
  subtitle: string;
  split: RoleSplit;
  kind: "dau" | "new";
  series: DailyRow[];
  chartKind: "line" | "bar";
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <header className="mb-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </header>
      <TrendChart data={series} kind={chartKind} />
      <div className="grid gap-4 sm:grid-cols-2">
        {(["customers", "providers"] as const).map((role) => {
          const b = split[role];
          const roleLabel = role === "customers" ? "Homeowners" : "Providers";
          return (
            <div key={role} className="mt-3 rounded-xl border border-border bg-background p-3">
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

  const newDaily = stats.new_daily ?? [];

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
        subtitle="Distinct users active per day (last 30d) · WoW & MoM averages below"
        split={stats.dau}
        kind="dau"
        series={stats.daily}
        chartKind="line"
      />
      <ReportCard
        title="New users"
        subtitle="Sign-ups per day (last 30d) · WoW & MoM totals below"
        split={stats.new_users}
        kind="new"
        series={newDaily}
        chartKind="bar"
      />
    </div>
  );
}