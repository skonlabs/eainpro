import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { CATEGORIES } from "@/lib/catalog";
import { MessageSquare, ImageIcon } from "lucide-react";

export const Route = createFileRoute("/messages")({
  component: MessagesPage,
});

type Row = {
  id: string;
  job_id: string;
  sender_id: string;
  recipient_id: string | null;
  body: string | null;
  kind: string | null;
  attachment_url: string | null;
  created_at: string;
};

type Thread = {
  jobId: string;
  peerId: string;
  lastBody: string;
  lastKind: string | null;
  lastAt: string;
  isMine: boolean;
  categorySlug: string | null;
  peerName: string;
  isProviderPeer: boolean;
};

function fmtTime(iso: string, lang: "en" | "my") {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString(lang === "en" ? "en-US" : "my-MM", { hour: "numeric", minute: "2-digit" });
  const diff = (now.getTime() - d.getTime()) / 86400000;
  if (diff < 7) return d.toLocaleDateString(lang === "en" ? "en-US" : "my-MM", { weekday: "short" });
  return d.toLocaleDateString();
}

function MessagesPage() {
  const { user, loading } = useAuth();
  const { lang } = useI18n();
  const nav = useNavigate();
  const [threads, setThreads] = useState<Thread[] | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      nav({ to: "/signin", search: { redirect: "/messages" } as never });
      return;
    }
    (async () => {
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, job_id, sender_id, recipient_id, body, kind, attachment_url, created_at")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      const rows = (msgs ?? []) as Row[];
      if (rows.length === 0) {
        setThreads([]);
        return;
      }

      // group by jobId + peerId (latest first)
      const grouped = new Map<string, Row[]>();
      for (const r of rows) {
        const peer = r.sender_id === user.id ? r.recipient_id : r.sender_id;
        if (!peer) continue;
        const key = `${r.job_id}::${peer}`;
        const arr = grouped.get(key) ?? [];
        arr.push(r);
        grouped.set(key, arr);
      }

      const jobIds = Array.from(new Set(rows.map((r) => r.job_id)));
      const peerIds = Array.from(
        new Set(
          rows.map((r) => (r.sender_id === user.id ? r.recipient_id : r.sender_id)).filter(Boolean) as string[],
        ),
      );

      const [{ data: jobs }, { data: provs }] = await Promise.all([
        supabase.from("job_requests").select("id, category_slug, customer_id").in("id", jobIds),
        peerIds.length
          ? supabase.from("providers").select("id, business_name").in("id", peerIds)
          : Promise.resolve({ data: [] as { id: string; business_name: string | null }[] }),
      ]);

      const jobMap = new Map((jobs ?? []).map((j) => [j.id, j as { id: string; category_slug: string; customer_id: string }]));
      const provMap = new Map((provs ?? []).map((p) => [p.id, p.business_name ?? null]));

      const list: Thread[] = [];
      for (const [key, arr] of grouped) {
        const [jobId, peerId] = key.split("::");
        const last = arr[0]; // already DESC
        const job = jobMap.get(jobId);
        const isProviderPeer = provMap.has(peerId);
        const peerName = isProviderPeer
          ? provMap.get(peerId) ?? (lang === "en" ? "Provider" : "ပညာရှင်")
          : lang === "en"
            ? "Customer"
            : "ဖောက်သည်";
        list.push({
          jobId,
          peerId,
          lastBody: last.body ?? "",
          lastKind: last.kind,
          lastAt: last.created_at,
          isMine: last.sender_id === user.id,
          categorySlug: job?.category_slug ?? null,
          peerName,
          isProviderPeer,
        });
      }

      list.sort((a, b) => +new Date(b.lastAt) - +new Date(a.lastAt));
      setThreads(list);
    })();
  }, [user, loading, lang, nav]);

  const L = (en: string, my: string) => (lang === "en" ? en : my);

  if (loading || threads === null) {
    return (
      <div className="px-1 py-6">
        <h1 className="text-2xl font-bold">{L("Messages", "မက်ဆေ့ဂျ်")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{L("Loading…", "တင်နေသည်…")}</p>
      </div>
    );
  }

  return (
    <div className="px-1 py-4">
      <h1 className="text-2xl font-bold tracking-tight">{L("Messages", "မက်ဆေ့ဂျ်")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {L("All conversations across your requests.", "သင့်တောင်းဆိုမှုများ၏ ဆွေးနွေးချက်များအားလုံး။")}
      </p>

      {threads.length === 0 ? (
        <div className="mt-10 grid place-items-center rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-secondary text-primary">
            <MessageSquare className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm font-semibold">{L("No messages yet", "မက်ဆေ့ဂျ်မရှိသေးပါ")}</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            {L(
              "Conversations with providers and customers will show up here.",
              "ပညာရှင်များနှင့် ဖောက်သည်များ၏ ဆွေးနွေးချက်များ ဤနေရာတွင် ပြပါမည်။",
            )}
          </p>
          <Link
            to="/my-requests"
            className="mt-4 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            {L("View my requests", "ကျွန်ုပ်၏တောင်းဆိုမှု")}
          </Link>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
          {threads.map((t) => {
            const cat = CATEGORIES.find((c) => c.slug === t.categorySlug);
            const catLabel = cat ? (lang === "en" ? cat.en : cat.my) : t.categorySlug ?? "";
            const initial = (t.peerName ?? "?").trim().slice(0, 1).toUpperCase();
            const preview =
              t.lastKind === "image"
                ? L("Photo", "ဓာတ်ပုံ")
                : t.lastBody.replace(/\s+/g, " ").trim();
            return (
              <li key={`${t.jobId}-${t.peerId}`}>
                <Link
                  to="/request/$jobId"
                  params={{ jobId: t.jobId }}
                  search={{ tab: "messages" } as never}
                  className="flex items-start gap-3 p-3 transition-colors hover:bg-accent/40 active:bg-accent"
                >
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary text-base font-bold text-primary">
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="truncate text-sm font-semibold">{t.peerName}</div>
                      <div className="shrink-0 text-[11px] text-muted-foreground">{fmtTime(t.lastAt, lang)}</div>
                    </div>
                    {catLabel && (
                      <div className="truncate text-[11px] font-medium uppercase tracking-wide text-primary/80">
                        {catLabel}
                      </div>
                    )}
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      {t.isMine && <span className="shrink-0">{L("You:", "သင်:")}</span>}
                      {t.lastKind === "image" && <ImageIcon className="h-3 w-3 shrink-0" />}
                      <span className="truncate">{preview || L("(no message)", "(မက်ဆေ့ဂျ်မရှိ)")}</span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// Avoid unused-import lint when memo not used.
void useMemo;
