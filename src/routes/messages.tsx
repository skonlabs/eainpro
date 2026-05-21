import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { MessageSquare } from "lucide-react";
import { LoadingState } from "@/components/site/LoadingState";

export const Route = createFileRoute("/messages")({ component: MessagesPage });

type Row = { id: string; lead_id: string; sender_id: string; recipient_id: string | null; body: string; created_at: string };
type Thread = { leadId: string; peerId: string; lastBody: string; lastAt: string; isMine: boolean };

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
        const key = `${r.lead_id}::${peer}`;
        const arr = grouped.get(key) ?? [];
        arr.push(r);
        grouped.set(key, arr);
      }
      const list: Thread[] = [];
      for (const [key, arr] of grouped) {
        const [leadId, peerId] = key.split("::");
        const last = arr[0];
        list.push({ leadId, peerId, lastBody: last.body, lastAt: last.created_at, isMine: last.sender_id === user.id });
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
          <p className="mt-3 text-sm font-semibold">{L("No messages yet", "မရှိ")}</p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
          {threads.map((t) => (
            <li key={`${t.leadId}-${t.peerId}`}>
              <Link to="/request/$leadId" params={{ leadId: t.leadId }} search={{ tab: "messages" }} className="flex items-start gap-3 p-3 transition-colors hover:bg-accent/40">
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-muted-foreground">{new Date(t.lastAt).toLocaleString()}</div>
                  <div className="mt-0.5 truncate text-sm">{t.isMine ? `${L("You: ", "သင်: ")}` : ""}{t.lastBody}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
