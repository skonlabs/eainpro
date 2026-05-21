import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Phone } from "lucide-react";
import type { Lead, T } from "./types";

export function DetailsCard({
  lead,
  photos,
  serviceName,
  isProvider,
  hasUnlock,
  canEdit,
  onUpdated,
  L,
}: {
  lead: Lead;
  photos: string[];
  serviceName: { en: string; my: string } | null;
  isProvider: boolean;
  hasUnlock: boolean;
  isCustomer: boolean;
  canEdit: boolean;
  onUpdated: (patch: Partial<Lead>) => void;
  L: T;
}) {
  const showContact = !isProvider || hasUnlock;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(lead.full_description ?? lead.short_description);
  const [urgency, setUrgency] = useState(lead.urgency);
  const [preferredDate, setPreferredDate] = useState(lead.preferred_date ?? "");
  const [preferredTime, setPreferredTime] = useState(lead.preferred_time ?? "");
  const [address, setAddress] = useState(lead.address ?? "");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    const text = draft.trim();
    if (!text) return;
    setSaving(true);
    const { error } = await supabase
      .from("customer_leads")
      .update({
        full_description: text,
        urgency,
        preferred_date: preferredDate || null,
        preferred_time: preferredTime || null,
        address: address.trim() || null,
      })
      .eq("id", lead.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    onUpdated({
      full_description: text,
      urgency,
      preferred_date: preferredDate || null,
      preferred_time: preferredTime || null,
      address: address.trim() || null,
    });
    setEditing(false);
    toast.success(L("Updated", "ပြင်ပြီး"));
  };
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">{L("Service", "ဝန်ဆောင်မှု")}</div>
          <div>{serviceName ? L(serviceName.en, serviceName.my) : "—"}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">{L("Status", "အခြေအနေ")}</div>
          <div className="capitalize">{lead.status.replace(/_/g, " ")}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">{L("Posted", "တင်ခဲ့")}</div>
          <div>{new Date(lead.created_at).toLocaleString()}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">{L("Budget", "ဘတ်ဂျက်")}</div>
          <div>
            {lead.budget_min || lead.budget_max
              ? `${lead.budget_min ? lead.budget_min.toLocaleString() : "—"} – ${lead.budget_max ? lead.budget_max.toLocaleString() : "—"} MMK`
              : "—"}
          </div>
        </div>
      </div>
      {lead.short_description && lead.full_description && lead.short_description !== lead.full_description && (
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">{L("Summary", "အကျဉ်း")}</div>
          <p className="mt-1 text-sm">{lead.short_description}</p>
        </div>
      )}
      <div>
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase text-muted-foreground">{L("Description", "ဖော်ပြ")}</div>
          {canEdit && !editing && (
            <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium text-primary hover:underline">
              {L("Edit", "ပြင်")}
            </button>
          )}
        </div>
        {editing ? (
          <div className="mt-1 space-y-2">
            <textarea
              className="w-full rounded-md border border-border bg-background p-2 text-sm"
              rows={4}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={saving}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[10px] font-semibold uppercase text-muted-foreground">{L("Urgency", "အရေးပေါ်")}</div>
                <select
                  className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm"
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  disabled={saving}
                >
                  <option value="now">now</option>
                  <option value="today">today</option>
                  <option value="this_week">this_week</option>
                  <option value="flexible">flexible</option>
                </select>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase text-muted-foreground">{L("Preferred date", "ရက်")}</div>
                <Input type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} disabled={saving} />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase text-muted-foreground">{L("Preferred time", "အချိန်")}</div>
                <Input type="time" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} disabled={saving} />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase text-muted-foreground">{L("Address", "လိပ်စာ")}</div>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={L("Street, ward…", "လမ်း, ရပ်ကွက်…")} disabled={saving} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => {
                setDraft(lead.full_description ?? lead.short_description);
                setUrgency(lead.urgency);
                setPreferredDate(lead.preferred_date ?? "");
                setPreferredTime(lead.preferred_time ?? "");
                setAddress(lead.address ?? "");
                setEditing(false);
              }} disabled={saving}>
                {L("Cancel", "ပယ်ဖျက်")}
              </Button>
              <Button size="sm" onClick={save} disabled={saving || !draft.trim()}>
                {saving ? L("Saving…", "သိမ်းနေသည်…") : L("Save", "သိမ်း")}
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm whitespace-pre-wrap">{lead.full_description ?? lead.short_description}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">{L("Urgency", "အရေးပေါ်")}</div>
          <div>{lead.urgency}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">{L("Preferred", "နှစ်သက်ရာ")}</div>
          <div>{lead.preferred_date ?? "—"} {lead.preferred_time ? `· ${lead.preferred_time}` : ""}</div>
        </div>
      </div>
      <div>
        <div className="text-xs font-semibold uppercase text-muted-foreground">{L("Location", "နေရာ")}</div>
        <div className="mt-1 flex items-center gap-1 text-sm">
          <MapPin className="h-3.5 w-3.5" />
          {lead.city_slug}{showContact && lead.address ? ` · ${lead.address}` : ""}
        </div>
      </div>
      {showContact && (
        <div className="rounded-lg border border-border bg-background p-3 text-sm">
          <div className="font-semibold">{lead.customer_name}</div>
          {lead.customer_phone && (
            <a href={`tel:${lead.customer_phone}`} className="mt-1 inline-flex items-center gap-1 text-primary">
              <Phone className="h-3.5 w-3.5" />
              {lead.customer_phone}
            </a>
          )}
        </div>
      )}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((u) => (
            <a key={u} href={u} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded-lg border border-border">
              <img src={u} alt="" className="h-full w-full object-cover" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}