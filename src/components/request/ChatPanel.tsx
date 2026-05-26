import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import type { Msg, T } from "./types";

export function ChatPanel({
  leadId,
  userId,
  messages,
  peerId,
  canSend,
  L,
}: {
  leadId: string;
  userId: string;
  messages: Msg[];
  peerId: string | null;
  canSend: boolean;
  L: T;
}) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  // Mark messages addressed to me on this lead as read whenever the chat
  // panel mounts or new messages arrive.
  useEffect(() => {
    const unread = messages.filter((m) => m.recipient_id === userId);
    if (!unread.length) return;
    void supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("lead_id", leadId)
      .eq("recipient_id", userId)
      .is("read_at", null);
  }, [leadId, userId, messages.length]);

  const send = async () => {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    const { error } = await supabase.from("messages").insert({
      lead_id: leadId,
      sender_id: userId,
      recipient_id: peerId,
      body: text,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setBody("");
  };

  return (
    <div className="rounded-2xl border border-border bg-card">
      <ul className="max-h-[420px] space-y-2 overflow-y-auto p-3">
        {messages.length === 0 && <li className="text-center text-xs text-muted-foreground">{L("No messages yet.", "မက်ဆေ့ဂျ် မရှိသေးပါ။ စတင် စကားပြောကြည့်ပါ။")}</li>}
        {messages.map((m) => {
          const mine = m.sender_id === userId;
          return (
            <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {m.body}
                <div className={`mt-0.5 text-[10px] opacity-70`}>{new Date(m.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>
              </div>
            </li>
          );
        })}
      </ul>
      {canSend && (
        <div className="flex gap-2 border-t border-border p-2">
          <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder={L("Type a message…", "ရိုက်ပါ…")} onKeyDown={(e) => e.key === "Enter" && send()} />
          <Button onClick={send} disabled={busy || !body.trim()}><Send className="h-4 w-4" /></Button>
        </div>
      )}
    </div>
  );
}