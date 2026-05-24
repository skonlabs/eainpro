import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { MessageSquare } from "lucide-react";
import { LoadingState } from "@/components/site/LoadingState";

export const Route = createFileRoute("/messages")({ component: MessagesPage });

type Row = { id: string; lead_id: string; sender_id: string; recipient_id: string | null; body: string; created_at: string };
type Thread = {
  peerId: string;
  peerName: string;
  lastLeadId: string;
  lastBody: string;
  lastAt: string;
  isMine: boolean;
  count: number;
};

function MessagesPage() {
  const { user, loading } = useAuth();
  const { lang } = useI18n();
  const nav = useNavigate();
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const L = (en: string, my: string) => (lang === "en" ? en : my);

  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/signin", search: { redirect: "/messages" } }); return; }
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, lead_id, sender_id, recipient_id, body, created_at")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      const rows = (data ?? []) as Row[];
      const grouped = new Map<string, Row[]>();
      for (const r of rows) {
        const peer = r.sender_id === user.id ? r.recipient_id : r.sender_id;
        if (!peer) continue;
        const arr = grouped.get(peer) ?? [];
        arr.push(r);
        grouped.set(peer, arr);
      }
      const peerIds = Array.from(grouped.keys());
      const [provRes, profRes] = await Promise.all([
        peerIds.length
          ? supabase.from("providers").select("id, business_name").in("id", peerIds)
          : Promise.resolve({ data: [] as { id: string; business_name: string | null }[] }),
        peerIds.length
          ? supabase.from("profiles").select("id, full_name").in("id", peerIds)
          : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
      ]);
      const nameMap = new Map<string, string>();
      for (const p of (profRes.data ?? []) as { id: string; full_name: string | null }[]) {
        if (p.full_name) nameMap.set(p.id, p.full_name);
      }
      for (const p of (provRes.data ?? []) as { id: string; business_name: string | null }[]) {
        if (p.business_name) nameMap.set(p.id, p.business_name);
      }
      const list: Thread[] = [];
      for (const [peerId, arr] of grouped) {
        const last = arr[0];
        list.push({
          peerId,
          peerName: nameMap.get(peerId) ?? L("Unknown", "အမည်မသိ"),
          lastLeadId: last.lead_id,
          lastBody: last.body,
          lastAt: last.created_at,
          isMine: last.sender_id === user.id,
          count: arr.length,
        });
      }
      list.sort((a, b) => +new Date(b.lastAt) - +new Date(a.lastAt));
      setThreads(list);
    })();
  }, [user, loading, nav]);

  if (loading || threads === null) {
    return (
      <div className="px-1 py-6">
        <h1 className="text-2xl font-bold">{L("Messages", "မက်ဆေ့")}</h1>
        <LoadingState label={L("Loading messages…", "ခဏစောင့်ပါ…")} />
      </div>
    );
  }
  return (
    <div className="px-1 py-4">
      <h1 className="text-2xl font-bold tracking-tight">{L("Messages", "မက်ဆေ့")}</h1>
      {threads.length === 0 ? (
        <div className="mt-10 grid place-items-center rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
          <MessageSquare className="h-6 w-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">{L("No messages yet", "မက်ဆေ့ဂျ် မရှိသေးပါ")}</p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
          {threads.map((t) => (
            <li key={t.peerId}>
              <Link to="/request/$leadId" params={{ leadId: t.lastLeadId }} search={{ tab: "messages" }} className="flex items-start gap-3 p-3 transition-colors hover:bg-accent/40">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {t.peerName.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-sm font-semibold">{t.peerName}</div>
                    <div className="shrink-0 text-xs text-muted-foreground">{new Date(t.lastAt).toLocaleString()}</div>
                  </div>
                  <div className="mt-0.5 truncate text-sm text-muted-foreground">
                    {t.isMine ? L("You: ", "သင်: ") : ""}{t.lastBody}
                  </div>
                  {t.count > 1 && (
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {t.count} {L("messages", "မက်ဆေ့များ")}
                    </div>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
