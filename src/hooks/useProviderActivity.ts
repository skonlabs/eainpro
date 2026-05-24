import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { type AppNotification, useNotifications } from "@/hooks/useNotifications";

type ActivityItem = AppNotification;

function mergeItems(...groups: ActivityItem[][]) {
  const byId = new Map<string, ActivityItem>();
  for (const group of groups) {
    for (const item of group) {
      const existing = byId.get(item.id);
      if (!existing || new Date(item.created_at).getTime() > new Date(existing.created_at).getTime()) {
        byId.set(item.id, item);
      }
    }
  }
  return [...byId.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function useProviderActivity(userId?: string, limit = 20) {
  const notifications = useNotifications(userId, limit);
  const [messageActivity, setMessageActivity] = useState<ActivityItem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    if (!userId) {
      setMessageActivity([]);
      setLoadingMessages(false);
      return;
    }

    let active = true;
    setLoadingMessages(true);

    const loadMessages = async () => {
      const { data: messages } = await supabase
        .from("messages")
        .select("id, lead_id, body, created_at")
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (!active) return;

      const next: ActivityItem[] = (messages ?? []).map((message: any) => ({
        id: `message:${message.id}`,
        kind: "message_received",
        title: "New message",
        body: message.body ?? null,
        link: message.lead_id ? `/request/${message.lead_id}?tab=messages` : "/messages",
        read_at: null,
        created_at: message.created_at,
      }));

      setMessageActivity(next);
      setLoadingMessages(false);
    };

    void loadMessages();

    const channel = supabase
      .channel(`provider-activity:${userId}:${limit}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `recipient_id=eq.${userId}` },
        () => {
          void loadMessages();
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [userId, limit]);

  const items = useMemo(
    () => mergeItems(notifications.items, messageActivity).slice(0, limit),
    [notifications.items, messageActivity, limit],
  );

  const unreadCount = useMemo(() => items.filter((item) => !item.read_at).length, [items]);

  return {
    ...notifications,
    items,
    unreadCount,
    loading: notifications.loading || loadingMessages,
  };
}