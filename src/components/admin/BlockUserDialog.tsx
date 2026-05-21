import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  const [openType, setOpenType] = useState<"soft" | "hard" | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const apply = async (block: boolean, type: "soft" | "hard" = "soft") => {
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
    toast.success(
      block
        ? type === "hard"
          ? "Account blocked — sign-in disabled"
          : "Account suspended — sign-in allowed, actions restricted"
        : "Restriction lifted",
    );
    setOpenType(null);
    setReason("");
    onChanged?.();
  };

  if (isBlocked) {
    const label = blockType === "hard" ? "Unblock" : "Unsuspend";
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => apply(false)}
        title={blockType === "hard" ? "Currently blocked (sign-in disabled)" : "Currently suspended (restricted)"}
      >
        {label}
      </Button>
    );
  }

  const isHard = openType === "hard";
  return (
    <>
      <div className="inline-flex gap-1.5">
        <Button size="sm" variant="outline" onClick={() => setOpenType("soft")}>
          Suspend
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:bg-destructive/10"
          onClick={() => setOpenType("hard")}
        >
          Block
        </Button>
      </div>
      <Dialog open={openType !== null} onOpenChange={(o) => !o && setOpenType(null)}>
        <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isHard ? "Block" : "Suspend"} {userLabel}
          </DialogTitle>
          <DialogDescription>
            {isHard
              ? "Block prevents the user from signing in at all. Active sessions are revoked immediately and future sign-in attempts are rejected with an explanatory message."
              : "Suspend lets the user keep signing in and browsing, but they cannot create requests, send messages, book, leave reviews, view or unlock leads. A persistent banner explains the restriction."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Reason (optional, shown in audit log)</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. repeated abuse reports" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpenType(null)} disabled={busy}>Cancel</Button>
          <Button
            variant={isHard ? "destructive" : "default"}
            disabled={busy}
            onClick={() => apply(true, openType ?? "soft")}
          >
            {busy ? "Applying…" : isHard ? "Block account" : "Suspend account"}
          </Button>
        </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
