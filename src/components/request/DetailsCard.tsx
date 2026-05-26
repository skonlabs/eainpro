import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Phone } from "lucide-react";
import type { Lead, T } from "./types";
import { Field, FieldLabel, FieldValue } from "./Field";
import { CITIES, TOWNSHIPS } from "@/lib/catalog";
import { bookingStatusPair } from "@/lib/status-i18n";

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
    const text = draft.trim().slice(0, 10000);
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
    <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        <Field label={L("Service", "ဝန်ဆောင်မှု")}>
          {serviceName ? L(serviceName.en, serviceName.my) : "—"}
        </Field>
        <Field label={L("Status", "အခြေအနေ")}>
          <span className="capitalize">{L(bookingStatusPair(lead.status).en, bookingStatusPair(lead.status).my)}</span>
        </Field>
        <Field label={L("Posted", "တင်ခဲ့")}>
          {new Date(lead.created_at).toLocaleString()}
        </Field>
        <Field label={L("Budget", "ဘတ်ဂျက်")}>
          {lead.budget_min || lead.budget_max
              ? `${lead.budget_min ? lead.budget_min.toLocaleString() : "—"} – ${lead.budget_max ? lead.budget_max.toLocaleString() : "—"} MMK`
              : "—"}
        </Field>
      </div>
      {lead.short_description && lead.full_description && lead.short_description !== lead.full_description && (
        <div className="border-t border-border/60 pt-4">
          <Field label={L("Summary", "အကျဉ်း")}>
            <p className="font-normal text-muted-foreground">{lead.short_description}</p>
          </Field>
        </div>
      )}
      <div className="border-t border-border/60 pt-4">
        <div className="flex items-center justify-between">
          <FieldLabel>{L("Description", "ဖော်ပြ")}</FieldLabel>
          {canEdit && !editing && (
            <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium text-primary hover:underline">
              {L("Edit", "ပြင်")}
            </button>
          )}
        </div>
        {editing ? (
          <div className="mt-2 space-y-3">
            <textarea
              className="w-full rounded-md border border-border bg-background p-2 text-sm"
              rows={4}
              maxLength={10000}
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 10000))}
              disabled={saving}
            />
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div className="min-w-0">
                <FieldLabel>{L("Urgency", "အရေးပေါ်")}</FieldLabel>
                <select
                  className="mt-2 w-full rounded-md border border-border bg-background p-2 text-sm"
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
              <div className="min-w-0">
                <FieldLabel>{L("Preferred date", "ရက်")}</FieldLabel>
                <Input className="mt-2" type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} disabled={saving} />
              </div>
              <div className="min-w-0">
                <FieldLabel>{L("Preferred time", "အချိန်")}</FieldLabel>
                <Input className="mt-2" type="time" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} disabled={saving} />
              </div>
              <div className="min-w-0">
                <FieldLabel>{L("Address", "လိပ်စာ")}</FieldLabel>
                <Input className="mt-2" value={address} onChange={(e) => setAddress(e.target.value)} placeholder={L("Street, ward…", "လမ်း, ရပ်ကွက်…")} disabled={saving} />
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
          <FieldValue className="whitespace-pre-wrap">{lead.full_description ?? lead.short_description}</FieldValue>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border/60 pt-4">
        <Field label={L("Urgency", "အရေးပေါ်")}>
          <span className="capitalize">{lead.urgency.replace(/_/g, " ")}</span>
        </Field>
        <Field label={L("Preferred", "နှစ်သက်ရာ")}>
          {lead.preferred_date ?? "—"}{lead.preferred_time ? ` · ${lead.preferred_time}` : ""}
        </Field>
        <Field label={L("Location", "နေရာ")} className="col-span-2">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <span>
              {(() => {
                const city = CITIES.find((c) => c.slug === lead.city_slug);
                const cityLabel = city ? city.en : lead.city_slug;
                const ts = lead.township_slug
                  ? TOWNSHIPS[lead.city_slug]?.find((t) => t.slug === lead.township_slug)
                  : null;
                const tsLabel = ts ? ts.en : lead.township_slug ?? null;
                return (
                  <>
                    <span className="capitalize">{cityLabel}</span>
                    {tsLabel ? <span> · {tsLabel}</span> : null}
                    {showContact && lead.address ? (
                      <span className="text-muted-foreground"> · {lead.address}</span>
                    ) : null}
                  </>
                );
              })()}
            </span>
          </span>
        </Field>
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
          {photos.map((u) => {
            const isVideo = /\.(mp4|mov|webm|m4v|ogg)(\?|$)/i.test(u);
            return (
              <a key={u} href={u} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded-lg border border-border bg-black">
                {isVideo ? (
                  <video src={u} className="h-full w-full object-cover" muted playsInline controls />
                ) : (
                  <img src={u} alt="" className="h-full w-full object-cover" />
                )}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}