import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type Props = {
  userId: string;
  userLabel: string;
  isBlocked: boolean;
  blockType: "soft" | "hard" | null;
  onChanged?: () => void;
};

export function BlockUserDialog({ userId, userLabel, isBlocked, blockType, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"soft" | "hard">("soft");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const apply = async (block: boolean) => {
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_set_user_blocked", {
      p_user_id: userId,
      p_blocked: block,
      p_type: block ? type : "soft",
      p_reason: block ? reason || null : null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (!data?.ok) return toast.error(data?.error ?? "Failed");
    toast.success(block ? `Blocked (${type})` : "Unblocked");
    setOpen(false);
    setReason("");
    onChanged?.();
  };

  if (isBlocked) {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => apply(false)}
        title={blockType ? `Currently ${blockType}-blocked` : undefined}
      >
        Unblock{blockType ? ` (${blockType})` : ""}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10">
          Block
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Block {userLabel}</DialogTitle>
          <DialogDescription>
            Soft block: user can still sign in but cannot create requests, send messages,
            book, leave reviews, or unlock leads. Hard block: same restrictions and active
            sessions are revoked immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Block type</Label>
            <div className="mt-1 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={type === "soft" ? "default" : "outline"}
                onClick={() => setType("soft")}
              >
                Soft
              </Button>
              <Button
                type="button"
                size="sm"
                variant={type === "hard" ? "default" : "outline"}
                onClick={() => setType("hard")}
              >
                Hard
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-xs">Reason (optional, shown in audit log)</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. repeated abuse reports" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button variant="destructive" disabled={busy} onClick={() => apply(true)}>
            {busy ? "Applying…" : `Block (${type})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
