import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, Check } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useNotifications } from "@/hooks/useNotifications";
import { translateNotificationTitle, translateNotificationBody } from "@/lib/notification-i18n";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export function NotificationBell() {
  const { user } = useAuth();
  const { lang } = useI18n();
  const nav = useNavigate();
  const L = (en: string, my: string) => (lang === "en" ? en : my);
  const [open, setOpen] = useState(false);
  const { items, unreadCount, markAllRead, markOneRead } = useNotifications(user?.id, 20);

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-muted-foreground hover:bg-secondary"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-semibold">{L("Notifications", "အကြောင်းကြားချက်များ")}</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
              <Check className="mr-1 h-3 w-3" />
              {L("Mark all read", "အားလုံး ဖတ်ပြီး")}
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {L("You're all caught up.", "အသစ်မရှိပါ။")}
            </p>
          )}
          <ul className="divide-y divide-border">
            {items.map((n) => {
              const inner = (
                <div className="flex gap-2 px-3 py-3 text-left">
                  {!n.read_at && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  <div className={`min-w-0 flex-1 ${n.read_at ? "opacity-70" : ""}`}>
                    <p className="truncate text-sm font-medium">{translateNotificationTitle(n.title, lang)}</p>
                    {n.body && <p className="line-clamp-2 text-xs text-muted-foreground">{translateNotificationBody(n.body, lang)}</p>}
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
              return (
                <li key={n.id} className="hover:bg-secondary/40">
                  <button
                    onClick={() => {
                      markOneRead(n.id);
                      setOpen(false);
                      if (n.link) nav({ to: n.link as never });
                    }}
                    className="block w-full"
                  >
                    {inner}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
}
