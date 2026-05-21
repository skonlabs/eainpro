import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { CATEGORIES, CITIES } from "@/lib/catalog";
import { Loader2, Upload, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

const DOC_KINDS: { key: "nrc_front" | "nrc_back" | "selfie" | "business_license"; en: string; my: string }[] = [
  { key: "nrc_front", en: "NRC / ID — front", my: "မှတ်ပုံတင် ရှေ့" },
  { key: "nrc_back", en: "NRC / ID — back", my: "မှတ်ပုံတင် နောက်" },
  { key: "selfie", en: "Selfie holding ID", my: "ID ကိုင်ထားသော ဆဲ(လ်)ဖီ" },
  { key: "business_license", en: "Business license (optional)", my: "လုပ်ငန်းလိုင်စင် (ရွေး)" },
];

type DocRow = {
  id: string;
  kind: string;
  storage_path: string;
  status: "pending" | "approved" | "rejected";
  review_note: string | null;
  created_at: string;
};

export const Route = createFileRoute("/provider/onboarding")({
  component: OnboardingPage,
  head: () => ({ meta: [{ title: "Provider onboarding — Fixido" }] }),
});

function OnboardingPage() {
  const { lang } = useI18n();
  const { user, loading: authLoading, refreshRoles } = useAuth();
  const nav = useNavigate();

  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState<"individual" | "business">("individual");
  const [bio, setBio] = useState("");
  const [years, setYears] = useState(0);
  const [supportsUrgent, setSupportsUrgent] = useState(false);
  const [cats, setCats] = useState<Record<string, string>>({}); // slug -> base price (string)
  const [cities, setCities] = useState<Record<string, boolean>>({ yangon: true });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [uploadingKind, setUploadingKind] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      nav({ to: "/signin", search: { redirect: "/provider/onboarding" } });
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("providers")
        .select("business_name, business_type, bio, years_experience, supports_urgent")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setBusinessName(data.business_name ?? "");
        setBusinessType((data.business_type as "individual" | "business") ?? "individual");
        setBio(data.bio ?? "");
        setYears(data.years_experience ?? 0);
        setSupportsUrgent(!!data.supports_urgent);
      }
      const [{ data: svcs }, { data: areas }] = await Promise.all([
        supabase.from("provider_services").select("category_slug, base_price").eq("provider_id", user.id),
        supabase.from("provider_service_areas").select("city_slug").eq("provider_id", user.id),
      ]);
      if (svcs) {
        const m: Record<string, string> = {};
        svcs.forEach((s) => (m[s.category_slug] = s.base_price?.toString() ?? ""));
        setCats(m);
      }
      if (areas && areas.length > 0) {
        const m: Record<string, boolean> = {};
        areas.forEach((a) => (m[a.city_slug] = true));
        setCities(m);
      }
      const { data: dRows } = await supabase
        .from("provider_documents")
        .select("id, kind, storage_path, status, review_note, created_at")
        .eq("provider_id", user.id)
        .order("created_at", { ascending: false });
      setDocs((dRows ?? []) as DocRow[]);
    })();
  }, [authLoading, user, nav]);

  const toggleCat = (slug: string) =>
    setCats((c) => {
      const n = { ...c };
      if (slug in n) delete n[slug];
      else n[slug] = "";
      return n;
    });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setErr(null);
    if (!businessName.trim()) {
      setErr(lang === "en" ? "Business name required" : "လုပ်ငန်းအမည် လိုအပ်");
      return;
    }
    if (Object.keys(cats).length === 0) {
      setErr(lang === "en" ? "Pick at least one service" : "ဝန်ဆောင်မှု အနည်းဆုံး ၁ ခု ရွေးပါ");
      return;
    }
    const cityList = Object.keys(cities).filter((k) => cities[k]);
    if (cityList.length === 0) {
      setErr(lang === "en" ? "Pick at least one city" : "မြို့ အနည်းဆုံး ၁ ခု ရွေးပါ");
      return;
    }
    setSaving(true);
    try {
      await saveProviderProfile(user.id, {
        business_name: businessName,
        business_type: businessType,
        bio,
        years_experience: years,
        supports_urgent: supportsUrgent,
        services: cats,
        cities,
      });
    } catch (e: any) {
      setSaving(false);
      setErr(e?.message ?? "Failed to save");
      return;
    }
    // Ensure provider role
    await supabase.from("user_roles").upsert(
      { user_id: user.id, role: "provider" },
      { onConflict: "user_id,role" },
    );
    await refreshRoles();
    setSaving(false);
    nav({ to: "/provider/dashboard" });
  };

  const uploadDoc = async (kind: string, file: File) => {
    if (!user) return;
    setUploadingKind(kind);
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${user.id}/${kind}-${Date.now()}.${ext}`;
    const up = await supabase.storage.from("provider-documents").upload(path, file, {
      upsert: false, contentType: file.type || undefined,
    });
    if (up.error) { setUploadingKind(null); toast.error(up.error.message); return; }
    const { data, error } = await supabase
      .from("provider_documents")
      .insert({ provider_id: user.id, kind, storage_path: path, status: "pending" })
      .select("id, kind, storage_path, status, review_note, created_at")
      .maybeSingle();
    setUploadingKind(null);
    if (error) { toast.error(error.message); return; }
    if (data) setDocs((p) => [data as DocRow, ...p]);
    toast.success("Uploaded — pending review");
  };

  const removeDoc = async (id: string) => {
    const doc = docs.find((d) => d.id === id);
    if (!doc) return;
    setDocs((p) => p.filter((d) => d.id !== id));
    await supabase.storage.from("provider-documents").remove([doc.storage_path]);
    await supabase.from("provider_documents").delete().eq("id", id);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">

      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-14">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {lang === "en" ? "Provider onboarding" : "ဝန်ဆောင်မှုပေးသူ မှတ်ပုံတင်"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {lang === "en"
            ? "Tell customers about your business so they can find you."
            : "ဖောက်သည်များက သင့်ကို ရှာတွေ့နိုင်ရန် သင်၏လုပ်ငန်းအကြောင်း ပြောပြပါ။"}
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-6">
          <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <div>
              <label className="text-sm font-medium">
                {lang === "en" ? "Business or your name" : "လုပ်ငန်း သို့ သင့်အမည်"}
              </label>
              <Input
                className="mt-1"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>
            <div className="flex gap-2 rounded-lg bg-secondary p-1">
              {(["individual", "business"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setBusinessType(t)}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
                    businessType === t ? "bg-card shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  {t === "individual"
                    ? lang === "en" ? "Individual" : "တစ်ဦးတည်း"
                    : lang === "en" ? "Business" : "လုပ်ငန်း"}
                </button>
              ))}
            </div>
            <div>
              <label className="text-sm font-medium">
                {lang === "en" ? "Short bio" : "မိတ်ဆက်"}
              </label>
              <Textarea
                className="mt-1"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">
                  {lang === "en" ? "Years of experience" : "အတွေ့အကြုံ နှစ်"}
                </label>
                <Input
                  className="mt-1"
                  type="number"
                  min={0}
                  value={years}
                  onChange={(e) => setYears(Number(e.target.value))}
                />
              </div>
              <label className="mt-6 flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={supportsUrgent}
                  onCheckedChange={(v) => setSupportsUrgent(!!v)}
                />
                {lang === "en" ? "Accept urgent same-day jobs" : "အရေးပေါ် တနေ့တည်း လက်ခံ"}
              </label>
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <div className="text-sm font-semibold">
              {lang === "en" ? "Services & base price (MMK)" : "ဝန်ဆောင်မှု နှင့် အခြေခံစျေး (ကျပ်)"}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {CATEGORIES.map((c) => {
                const active = c.slug in cats;
                return (
                  <div
                    key={c.slug}
                    className={`rounded-xl border p-3 transition ${
                      active ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                      <Checkbox
                        checked={active}
                        onCheckedChange={() => toggleCat(c.slug)}
                      />
                      {lang === "en" ? c.en : c.my}
                    </label>
                    {active && (
                      <Input
                        className="mt-2 h-8 text-sm"
                        placeholder={lang === "en" ? "Base price (optional)" : "အခြေခံစျေး (ရွေး)"}
                        value={cats[c.slug]}
                        onChange={(e) =>
                          setCats((s) => ({ ...s, [c.slug]: e.target.value }))
                        }
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <div className="text-sm font-semibold">
              {lang === "en" ? "Service areas" : "ဝန်ဆောင်ပေးသော နယ်မြေ"}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CITIES.map((c) => (
                <label
                  key={c.slug}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-sm transition ${
                    cities[c.slug] ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <Checkbox
                    checked={!!cities[c.slug]}
                    onCheckedChange={(v) => setCities((s) => ({ ...s, [c.slug]: !!v }))}
                  />
                  {lang === "en" ? c.en : c.my}
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <div>
              <div className="text-sm font-semibold">
                {lang === "en" ? "Verification documents" : "အတည်ပြုစာရွက်စာတမ်း"}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {lang === "en"
                  ? "Upload your ID and a selfie so admin can verify you. Required for the verified badge."
                  : "သင်၏ မှတ်ပုံတင်နှင့် ဆဲ(လ်)ဖီ တင်ပါ။ verified ဖြစ်ရန် လိုအပ်သည်။"}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {DOC_KINDS.map((k) => {
                const mine = docs.filter((d) => d.kind === k.key);
                const latest = mine[0];
                return (
                  <div key={k.key} className="rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium">{lang === "en" ? k.en : k.my}</div>
                      {latest && (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          latest.status === "approved" ? "bg-emerald-100 text-emerald-700"
                            : latest.status === "rejected" ? "bg-destructive/10 text-destructive"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {latest.status === "approved" && <CheckCircle2 className="h-3 w-3" />}
                          {latest.status === "rejected" && <XCircle className="h-3 w-3" />}
                          {latest.status === "pending" && <Clock className="h-3 w-3" />}
                          {latest.status}
                        </span>
                      )}
                    </div>
                    {latest?.status === "rejected" && latest.review_note && (
                      <p className="mt-1 text-xs text-destructive">{latest.review_note}</p>
                    )}
                    <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border bg-background px-3 py-2 text-xs font-medium hover:bg-accent">
                      <Upload className="h-3.5 w-3.5" />
                      {uploadingKind === k.key
                        ? (lang === "en" ? "Uploading…" : "တင်နေ…")
                        : latest
                        ? (lang === "en" ? "Replace file" : "အသစ်တင်")
                        : (lang === "en" ? "Upload file" : "ဖိုင်တင်")}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        disabled={!!uploadingKind}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadDoc(k.key, f);
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                    {latest && (
                      <button
                        type="button"
                        onClick={() => removeDoc(latest.id)}
                        className="mt-1 text-[11px] text-muted-foreground hover:text-destructive"
                      >
                        {lang === "en" ? "Remove" : "ဖျက်"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {err && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {err}
            </p>
          )}

          <Button type="submit" disabled={saving} className="h-11 w-full rounded-xl font-semibold">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {lang === "en" ? "Saving…" : "သိမ်းနေ…"}
              </>
            ) : lang === "en" ? "Save and continue" : "သိမ်းပြီး ဆက်လုပ်ရန်"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {lang === "en"
              ? "Admin approval is required before your public profile goes live."
              : "သင်၏ ပရိုဖိုင် မထွက်ပေါ်မီ Admin ၏ အတည်ပြုချက် လိုအပ်ပါသည်။"}
          </p>
        </form>
      </main>

    </div>
  );
}