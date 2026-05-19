import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { listAvailableLeads, listMyUnlocks, unlockLead, updateUnlockStatus, UNLOCK_ERROR_MESSAGES, type LeadPreview } from "@/lib/leads";
import { fmt, getWallet } from "@/lib/wallet";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Lock, Unlock, MapPin, Clock, Image as ImageIcon, Phone, Wallet } from "lucide-react";

export const Route = createFileRoute("/provider/leads")({
  component: LeadsPage,
  head: () => ({ meta: [{ title: "Leads — Eain Pro" }] }),
});

const STATUS_OPTIONS = ["unlocked","contacted","quoted","won","lost","customer_no_response","invalid","completed"] as const;

function LeadsPage() {
  const { user, roles, loading } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState("available");
  const [available, setAvailable] = useState<LeadPreview[] | null>(null);
  const [unlocked, setUnlocked] = useState<any[] | null>(null);
  const [won, setWon] = useState<any[]>([]);
  const [lost, setLost] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [pickedLead, setPickedLead] = useState<LeadPreview | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  const refresh = async () => {
    if (!user) return;
    const w = await getWallet(user.id);
    setBalance(w?.balance_credits ?? 0);
    const [a, u, wn, ls] = await Promise.all([
      listAvailableLeads(user.id),
      listMyUnlocks(user.id, ["unlocked","contacted","quoted","completed"]),
      listMyUnlocks(user.id, ["won"]),
      listMyUnlocks(user.id, ["lost","customer_no_response","invalid"]),
    ]);
    setAvailable(a);
    setUnlocked(u);
    setWon(wn);
    setLost(ls);
  };

  useEffect(() => {
    if (loading) return;
    if (!user) return void nav({ to: "/signin", search: { redirect: "/provider/leads" } });
    if (!roles.includes("provider")) return void nav({ to: "/provider/onboarding" });
    refresh();
  }, [loading, user, roles, nav]);

  if (loading || !user) return null;

  const doUnlock = async () => {
    if (!pickedLead) return;
    setUnlocking(true);
    try {
      const res = await unlockLead(pickedLead.id);
      if (!res.ok) {
        toast.error(UNLOCK_ERROR_MESSAGES[res.error ?? ""] ?? res.error ?? "Failed to unlock");
      } else {
        toast.success("Lead unlocked! Customer details revealed.");
        setPickedLead(null);
        refresh();
        setTab("unlocked");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Leads</h1>
          <Link to="/provider/wallet" className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <Wallet className="h-3.5 w-3.5" /> {fmt(balance)} credits
          </Link>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="available">Available</TabsTrigger>
            <TabsTrigger value="unlocked">Unlocked</TabsTrigger>
            <TabsTrigger value="won">Won</TabsTrigger>
            <TabsTrigger value="lost">Lost</TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="space-y-3">
            {available === null ? <SkelList /> :
              available.length === 0 ? <Empty msg="No matching leads in your service areas right now. Check back soon." /> :
              available.map((l) => <LockedCard key={l.id} lead={l} onUnlock={() => setPickedLead(l)} />)}
          </TabsContent>

          <TabsContent value="unlocked" className="space-y-3">
            {unlocked === null ? <SkelList /> :
              unlocked.length === 0 ? <Empty msg="You haven't unlocked any leads yet." /> :
              unlocked.map((u) => <UnlockedCard key={u.id} unlock={u} onChange={refresh} />)}
          </TabsContent>

          <TabsContent value="won" className="space-y-3">
            {won.length === 0 ? <Empty msg="No won jobs yet." /> :
              won.map((u) => <UnlockedCard key={u.id} unlock={u} onChange={refresh} />)}
          </TabsContent>

          <TabsContent value="lost" className="space-y-3">
            {lost.length === 0 ? <Empty msg="No lost or invalid leads." /> :
              lost.map((u) => <UnlockedCard key={u.id} unlock={u} onChange={refresh} />)}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!pickedLead} onOpenChange={(o) => !o && setPickedLead(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlock this lead?</DialogTitle>
          </DialogHeader>
          {pickedLead && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-border p-3">
                <div className="font-medium">{pickedLead.service_name_en}</div>
                <div className="text-xs text-muted-foreground mt-1">{pickedLead.short_description}</div>
              </div>
              <p>
                You are about to spend <strong>{fmt(pickedLead.lead_price_credits)} credits</strong> to unlock this lead.
                If the customer details are valid, this fee is non-refundable.
              </p>
              <p className="text-xs text-muted-foreground">
                {pickedLead.current_unlock_count} of {pickedLead.max_provider_unlocks} providers have unlocked this lead.
              </p>
              {balance < pickedLead.lead_price_credits && (
                <p className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
                  Insufficient credits. You have {fmt(balance)}, need {fmt(pickedLead.lead_price_credits)}.{" "}
                  <Link to="/provider/wallet" className="underline">Top up</Link>
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPickedLead(null)}>Cancel</Button>
            <Button onClick={doUnlock} disabled={unlocking || (pickedLead ? balance < pickedLead.lead_price_credits : true)}>
              {unlocking ? "Unlocking…" : `Unlock for ${fmt(pickedLead?.lead_price_credits ?? 0)} credits`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SkelList() {
  return <div className="space-y-3">{[0,1,2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}</div>;
}
function Empty({ msg }: { msg: string }) {
  return <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">{msg}</p>;
}

function LockedCard({ lead, onUnlock }: { lead: LeadPreview; onUnlock: () => void }) {
  const slotsLeft = lead.max_provider_unlocks - lead.current_unlock_count;
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold">{lead.service_name_en}</div>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{lead.city_slug}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{lead.urgency}</span>
            {lead.photo_count > 0 && <span className="flex items-center gap-1"><ImageIcon className="h-3 w-3" />{lead.photo_count}</span>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-primary">{fmt(lead.lead_price_credits)}</div>
          <div className="text-[10px] text-muted-foreground">credits to view</div>
        </div>
      </div>
      <p className="mt-2 text-sm text-muted-foreground italic">
        Lead details are hidden. View the lead to see the customer's request, contact info and address.
      </p>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {lead.current_unlock_count} of {lead.max_provider_unlocks} unlocked
          {slotsLeft <= 2 && <span className="ml-1 font-semibold text-amber-600">· {slotsLeft} slot{slotsLeft===1?"":"s"} left</span>}
        </span>
        <Button size="sm" onClick={onUnlock}><Lock className="mr-1 h-3.5 w-3.5" />View Lead ({fmt(lead.lead_price_credits)} credits)</Button>
      </div>
    </div>
  );
}

function UnlockedCard({ unlock, onChange }: { unlock: any; onChange: () => void }) {
  const l = unlock.customer_leads;
  const [status, setStatus] = useState(unlock.status);
  const [price, setPrice] = useState<string>(unlock.quoted_price_mmk?.toString() ?? "");
  const [notes, setNotes] = useState(unlock.provider_notes ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateUnlockStatus(unlock.id, {
        status,
        quoted_price_mmk: price ? parseInt(price, 10) : null,
        provider_notes: notes || null,
      });
      toast.success("Saved");
      onChange();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  if (!l) return null;
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Unlock className="h-4 w-4 text-green-600" />
            <span className="font-semibold">{l.customer_name}</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {l.city_slug} · {l.urgency} · unlocked {new Date(unlock.unlocked_at).toLocaleDateString()}
          </div>
        </div>
        <a href={`tel:${l.customer_phone}`} className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
          <Phone className="h-3 w-3" />{l.customer_phone}
        </a>
      </div>
      {l.address && <p className="mt-2 text-xs"><strong>Address:</strong> {l.address}</p>}
      <p className="mt-2 text-sm">{l.full_description ?? l.short_description}</p>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <select className="rounded-md border border-border bg-background px-2 py-1.5 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g," ")}</option>)}
        </select>
        <Input placeholder="Quoted price (MMK)" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} />
        <Button size="sm" onClick={save} disabled={saving}>{saving?"Saving…":"Save"}</Button>
      </div>
      <Textarea className="mt-2" placeholder="Internal notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      {unlock.is_refunded && <p className="mt-2 text-xs text-amber-600">Refunded: {fmt(unlock.refunded_amount_credits)} credits</p>}
    </div>
  );
}
