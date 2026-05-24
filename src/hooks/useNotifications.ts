import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export type AppNotification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

function sortNotifications(items: AppNotification[]) {
  return [...items].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function useNotifications(userId?: string, limit = 20) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const reloadRef = useRef(0);

  const refresh = useCallback(() => {
    reloadRef.current += 1;
  }, []);

  useEffect(() => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    void (async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, kind, title, body, link, read_at, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (!active) return;
      setItems((data as AppNotification[]) ?? []);
      setLoading(false);
    })();

    const channel = supabase
      .channel(`notifications:${userId}:${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const next = payload.new as AppNotification;
          setItems((current) => sortNotifications([next, ...current.filter((item) => item.id !== next.id)]).slice(0, limit));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const next = payload.new as AppNotification;
          setItems((current) => sortNotifications(current.some((item) => item.id === next.id)
            ? current.map((item) => (item.id === next.id ? next : item))
            : [next, ...current]).slice(0, limit));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const previous = payload.old as Pick<AppNotification, "id">;
          setItems((current) => current.filter((item) => item.id !== previous.id));
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [userId, limit]);

  const unreadCount = useMemo(() => items.filter((item) => !item.read_at).length, [items]);

  const markOneRead = useCallback(
    async (id: string) => {
      const readAt = new Date().toISOString();
      setItems((current) => current.map((item) => (item.id === id && !item.read_at ? { ...item, read_at: readAt } : item)));
      await supabase.from("notifications").update({ read_at: readAt }).eq("id", id);
    },
    [],
  );

  const markAllRead = useCallback(async () => {
    const ids = items.filter((item) => !item.read_at).map((item) => item.id);
    if (ids.length === 0) return;
    const readAt = new Date().toISOString();
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? readAt })));
    await supabase.from("notifications").update({ read_at: readAt }).in("id", ids);
  }, [items]);

  return { items, loading, unreadCount, refresh, markOneRead, markAllRead };
}