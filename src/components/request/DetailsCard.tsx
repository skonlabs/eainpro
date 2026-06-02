import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Phone, Star } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Lead, T } from "./types";
import { Field, FieldLabel, FieldValue } from "./Field";
import { CITIES, TOWNSHIPS, TIMING_OPTIONS, WINDOW_OPTIONS } from "@/lib/catalog";
import { bookingStatusPair } from "@/lib/status-i18n";
import { windowLabel } from "@/lib/display-i18n";

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function whenLabel(urgency: string, createdAt: string, preferredDate: string | null, L: T) {
  const created = new Date(createdAt);
  switch (urgency) {
    case "today":
      return formatDate(created);
    case "tomorrow": {
      const t = new Date(created);
      t.setDate(t.getDate() + 1);
      return formatDate(t);
    }
    case "this_week":
      return L("This Week", "ဒီအပတ်");
    case "flexible":
      return preferredDate ?? L("Flexible", "ပြောင်းလဲနိုင်သည်");
    default:
      return preferredDate ?? urgency.replace(/_/g, " ");
  }
}

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
  const initialTiming = (TIMING_OPTIONS.find((t) => t.value === lead.urgency)?.value ?? "flexible") as typeof TIMING_OPTIONS[number]["value"];
  const [urgency, setUrgency] = useState<string>(initialTiming);
  const [preferredDate, setPreferredDate] = useState(lead.preferred_date ?? "");
  const [preferredTime, setPreferredTime] = useState(lead.preferred_time ?? "");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("customer_leads")
      .update({
        urgency,
        preferred_date: preferredDate || null,
        preferred_time: preferredTime || null,
      })
      .eq("id", lead.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    onUpdated({
      urgency,
      preferred_date: preferredDate || null,
      preferred_time: preferredTime || null,
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
          {(() => {
            const lo = lead.budget_min;
            const hi = lead.budget_max;
            if (!lo && !hi) return L("No fixed budget", "မသတ်မှတ်");
            if (!lo && hi) return L(`Under ${hi.toLocaleString()} MMK`, `${hi.toLocaleString()} ကျပ်အောက်`);
            if (lo && !hi) return L(`${lo.toLocaleString()}+ MMK`, `${lo.toLocaleString()}+ ကျပ်`);
            return `${lo!.toLocaleString()} – ${hi!.toLocaleString()} MMK`;
          })()}
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
        </div>
        <FieldValue className="whitespace-pre-wrap">{lead.full_description ?? lead.short_description}</FieldValue>
      </div>
      <div className="border-t border-border/60 pt-4">
        <div className="flex items-center justify-between">
          <FieldLabel>{L("Schedule", "အချိန်ဇယား")}</FieldLabel>
          {canEdit && !editing && (
            <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium text-primary hover:underline">
              {L("Edit", "ပြင်")}
            </button>
          )}
        </div>
        {editing ? (
          <div className="mt-3 space-y-4">
            <div>
              <FieldLabel>{L("When", "ဘယ်အချိန်")}</FieldLabel>
              <select
                className="mt-2 w-full rounded-md border border-border bg-background p-2 text-sm"
                value={preferredDate ? "" : urgency}
                onChange={(e) => { setUrgency(e.target.value); setPreferredDate(""); }}
                disabled={saving}
              >
                <option value="" disabled>{L("Select…", "ရွေးပါ…")}</option>
                {TIMING_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{L(t.en, t.my)}</option>
                ))}
              </select>
              <label className="mt-3 block text-xs font-semibold text-muted-foreground">
                {L("Or pick a specific date", "သို့မဟုတ် ရက်ရွေးပါ")}
              </label>
              <Input
                className="mt-1"
                type="date"
                value={preferredDate}
                onChange={(e) => { setPreferredDate(e.target.value); if (e.target.value) setUrgency("flexible"); }}
                disabled={saving}
              />
            </div>
            <div>
              <FieldLabel>{L("Preferred Time", "နှစ်သက်သော အချိန်")}</FieldLabel>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {WINDOW_OPTIONS.map((w) => (
                  <button
                    key={w.value}
                    type="button"
                    onClick={() => setPreferredTime(preferredTime === w.value ? "" : w.value)}
                    disabled={saving}
                    className={`rounded-md border p-2 text-sm ${preferredTime === w.value ? "border-primary bg-primary/10 font-semibold text-primary" : "border-border bg-background"}`}
                  >
                    {L(w.en, w.my)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => {
                setUrgency(initialTiming);
                setPreferredDate(lead.preferred_date ?? "");
                setPreferredTime(lead.preferred_time ?? "");
                setEditing(false);
              }} disabled={saving}>
                {L("Cancel", "ပယ်ဖျက်")}
              </Button>
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? L("Saving…", "သိမ်းနေသည်…") : L("Save", "သိမ်း")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-5">
            <Field label={L("When", "ဘယ်အချိန်")}>
              {whenLabel(lead.urgency, lead.created_at, lead.preferred_date, L)}
            </Field>
            <Field label={L("Preferred Time", "နှစ်သက်သော အချိန်")}>
              {lead.preferred_time ? (L("en", "my") === "my" ? windowLabel(lead.preferred_time, "my") : windowLabel(lead.preferred_time, "en")) : "—"}
            </Field>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border/60 pt-4">
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
          {lead.customer_id ? (
            <Link
              to="/c/$customerId"
              params={{ customerId: lead.customer_id }}
              className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-2 hover:underline"
            >
              {lead.customer_name}
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
            </Link>
          ) : (
            <div className="font-semibold">{lead.customer_name}</div>
          )}
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