import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { MessageSquare, ChevronRight, ChevronDown } from "lucide-react";
import { LoadingState } from "@/components/site/LoadingState";

export const Route = createFileRoute("/messages")({ component: MessagesPage });

type Row = { id: string; lead_id: string; sender_id: string; recipient_id: string | null; body: string; created_at: string };
type LeadInfo = { id: string; title: string; serviceLabel: string | null };
type LeadThread = {
  leadId: string;
  title: string;
  serviceLabel: string | null;
  lastBody: string;
  lastAt: string;
  isMine: boolean;
  count: number;
};
type PeerGroup = {
  peerId: string;
  peerName: string;
  peerRole: "provider" | "customer" | "unknown";
  lastAt: string;
  totalCount: number;
  leads: LeadThread[];
};

function MessagesPage() {
  const { user, loading } = useAuth();
  const { lang } = useI18n();
  const nav = useNavigate();
  const [threads, setThreads] = useState<PeerGroup[] | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const L = (en: string, my: string) => (lang === "en" ? en : my);

  const togglePeer = (peerId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(peerId)) next.delete(peerId); else next.add(peerId);
      return next;
    });
  };

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
      const byPeerLead = new Map<string, Map<string, Row[]>>();
      const peerIdsSet = new Set<string>();
      const leadIdsSet = new Set<string>();
      for (const r of rows) {
        const peer = r.sender_id === user.id ? r.recipient_id : r.sender_id;
        if (!peer) continue;
        peerIdsSet.add(peer);
        leadIdsSet.add(r.lead_id);
        let inner = byPeerLead.get(peer);
        if (!inner) { inner = new Map(); byPeerLead.set(peer, inner); }
        const arr = inner.get(r.lead_id) ?? [];
        arr.push(r);
        inner.set(r.lead_id, arr);
      }
      const peerIds = Array.from(peerIdsSet);
      const leadIds = Array.from(leadIdsSet);
      const [provRes, profRes, leadRes, quoteRes] = await Promise.all([
        peerIds.length
          ? supabase.from("providers").select("id, business_name").in("id", peerIds)
          : Promise.resolve({ data: [] as { id: string; business_name: string | null }[] }),
        peerIds.length
          ? supabase.from("profiles").select("id, full_name").in("id", peerIds)
          : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
        leadIds.length
          ? supabase
              .from("customer_leads")
              .select("id, short_description, service_type_id, customer_id, customer_name")
              .in("id", leadIds)
          : Promise.resolve({ data: [] as { id: string; short_description: string | null; service_type_id: string | null; customer_id: string | null; customer_name: string | null }[] }),
        leadIds.length
          ? supabase
              .from("quotes")
              .select("provider_id, provider:providers(business_name)")
              .in("lead_id", leadIds)
          : Promise.resolve({ data: [] as { provider_id: string; provider: { business_name: string | null } | null }[] }),
      ]);
      const providerNames = new Map<string, string>();
      const profileNames = new Map<string, string>();
      const customerNames = new Map<string, string>();
      for (const p of (profRes.data ?? []) as { id: string; full_name: string | null }[]) {
        if (p.full_name) profileNames.set(p.id, p.full_name);
      }
      for (const p of (provRes.data ?? []) as { id: string; business_name: string | null }[]) {
        if (p.business_name) providerNames.set(p.id, p.business_name);
      }
      for (const q of (quoteRes.data ?? []) as { provider_id: string; provider: { business_name: string | null } | null }[]) {
        if (q.provider?.business_name && !providerNames.has(q.provider_id)) {
          providerNames.set(q.provider_id, q.provider.business_name);
        }
      }
      const leadsArr = (leadRes.data ?? []) as { id: string; short_description: string | null; service_type_id: string | null; customer_id: string | null; customer_name: string | null }[];
      for (const l of leadsArr) {
        if (l.customer_id && l.customer_name) customerNames.set(l.customer_id, l.customer_name);
      }
      const stIds = Array.from(new Set(leadsArr.map((l) => l.service_type_id).filter(Boolean) as string[]));
      const stRes = stIds.length
        ? await supabase.from("service_types").select("id, name_en, name_my").in("id", stIds)
        : { data: [] as { id: string; name_en: string | null; name_my: string | null }[] };
      const stMap = new Map<string, { en: string; my: string }>();
      for (const s of (stRes.data ?? []) as { id: string; name_en: string | null; name_my: string | null }[]) {
        stMap.set(s.id, { en: s.name_en ?? "", my: s.name_my ?? "" });
      }
      const leadInfo = new Map<string, LeadInfo>();
      for (const l of leadsArr) {
        const st = l.service_type_id ? stMap.get(l.service_type_id) : null;
        const svcLabel = st ? ((lang === "en" ? st.en : st.my) || st.en) : null;
        // Title = service name (clear category). Subtitle = short description (the actual job).
        const title = svcLabel || L("Service request", "ဝန်ဆောင်မှု တောင်းဆို");
        leadInfo.set(l.id, { id: l.id, title, serviceLabel: l.short_description?.trim() || null });
      }
      const groups: PeerGroup[] = [];
      for (const [peerId, inner] of byPeerLead) {
        const isCustomer = customerNames.has(peerId);
        const isProvider = providerNames.has(peerId);
        const peerName =
          (isProvider ? providerNames.get(peerId) : undefined) ??
          (isCustomer ? customerNames.get(peerId) : undefined) ??
          profileNames.get(peerId) ??
          L("Customer", "ဖောက်သည်");
        const role: "provider" | "customer" | "unknown" =
          isProvider ? "provider" : isCustomer ? "customer" : "unknown";
        const leads: LeadThread[] = [];
        let total = 0;
        let peerLastAt = "";
        for (const [leadId, arr] of inner) {
          const last = arr[0];
          const info = leadInfo.get(leadId);
          leads.push({
            leadId,
            title: info?.title ?? L("Request", "တောင်းဆို"),
            serviceLabel: info?.serviceLabel ?? null,
            lastBody: last.body,
            lastAt: last.created_at,
            isMine: last.sender_id === user.id,
            count: arr.length,
          });
          total += arr.length;
          if (last.created_at > peerLastAt) peerLastAt = last.created_at;
        }
        leads.sort((a, b) => +new Date(b.lastAt) - +new Date(a.lastAt));
        groups.push({ peerId, peerName, peerRole: role, lastAt: peerLastAt, totalCount: total, leads });
      }
      groups.sort((a, b) => +new Date(b.lastAt) - +new Date(a.lastAt));
      setThreads(groups);
    })();
  }, [user, loading, nav, lang]);

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
        <div className="mt-4 space-y-4">
          {threads.map((g) => (
            <section key={g.peerId} className="overflow-hidden rounded-2xl border border-border bg-card">
              <header className="flex items-center gap-3 border-b border-border/60 bg-muted/30 px-3 py-2.5">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {g.peerName.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{g.peerName}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {g.peerRole === "provider" ? L("Provider", "ပညာရှင်") : g.peerRole === "customer" ? L("Homeowner", "အိမ်ပိုင်ရှင်") : ""}
                    {" · "}
                    {g.leads.length} {g.leads.length === 1 ? L("job", "အလုပ်") : L("jobs", "အလုပ်များ")}
                  </div>
                </div>
              </header>
              <ul className="divide-y divide-border">
                {g.leads.map((t) => (
                  <li key={t.leadId}>
                    <Link
                      to="/request/$leadId"
                      params={{ leadId: t.leadId }}
                      search={{ tab: "messages" }}
                      className="flex items-start gap-3 p-3 transition-colors hover:bg-accent/40"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate text-sm font-semibold">{t.title}</div>
                          <div className="shrink-0 text-[11px] text-muted-foreground">{new Date(t.lastAt).toLocaleDateString()}</div>
                        </div>
                        {t.serviceLabel && t.serviceLabel !== t.title && (
                          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{t.serviceLabel}</div>
                        )}
                        <div className="mt-1 truncate text-sm text-muted-foreground">
                          {t.isMine ? L("You: ", "သင်: ") : ""}{t.lastBody}
                        </div>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
