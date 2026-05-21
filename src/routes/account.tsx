import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { saveProviderProfile } from "@/lib/provider";
import { CITIES, CATEGORIES, TOWNSHIPS } from "@/lib/catalog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MapPin, Plus, Star, Trash2, BadgeCheck, LogOut, Briefcase } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/account")({
  component: AccountPage,
  head: () => ({ meta: [{ title: "Account — Fixido" }] }),
});

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  preferred_language: string | null;
};
type Address = {
  id: string;
  label: string;
  city_slug: string | null;
  area: string | null;
  address: string | null;
  landmark: string | null;
  phone: string | null;
  is_default: boolean;
};
type FavRow = {
  provider_id: string;
  provider: {
    id: string;
    business_name: string | null;
    rating_avg: number;
    rating_count: number;
    is_verified: boolean;
    logo_url: string | null;
  } | null;
};

function AccountPage() {
  const { lang, setLang } = useI18n();
  const { user, loading: authLoading, signOut, roles } = useAuth();
  const isProvider = roles.includes("provider");
  const nav = useNavigate();
  const L = (en: string, my: string) => (lang === "en" ? en : my);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [addrs, setAddrs] = useState<Address[]>([]);
  const [favs, setFavs] = useState<FavRow[]>([]);
  const [showAddr, setShowAddr] = useState(false);
  const [draft, setDraft] = useState<Partial<Address>>({
    label: "",
    city_slug: "yangon",
    area: "",
    address: "",
    landmark: "",
    phone: "",
    is_default: false,
  });

  // Provider profile state
  const [biz, setBiz] = useState({
    business_name: "",
    business_type: "individual" as "individual" | "business",
    bio: "",
    years_experience: 0,
    supports_urgent: false,
  });
  const [bizCats, setBizCats] = useState<Record<string, string>>({});
  const [bizCities, setBizCities] = useState<Record<string, boolean>>({});
  const [savingBiz, setSavingBiz] = useState(false);
  const [bizMsg, setBizMsg] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      nav({ to: "/signin", search: { redirect: "/account" } });
      return;
    }
    (async () => {
      const [{ data: p }, { data: a }, { data: f }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, phone, preferred_language")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("saved_addresses")
          .select("id, label, city_slug, area, address, landmark, phone, is_default")
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase
          .from("favorites")
          .select(
            "provider_id, provider:providers(id, business_name, rating_avg, rating_count, is_verified, logo_url)",
          ),
      ]);
      setProfile(
        (p as Profile) ?? { id: user.id, full_name: "", phone: "", preferred_language: lang },
      );
      setAddrs((a as Address[]) ?? []);
      setFavs((f as unknown as FavRow[]) ?? []);
    })();
  }, [authLoading, user, nav, lang]);

  useEffect(() => {
    if (!user || !isProvider) return;
    (async () => {
      const [{ data: p }, { data: svcs }, { data: areas }] = await Promise.all([
        supabase
          .from("providers")
          .select("business_name, business_type, bio, years_experience, supports_urgent")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("provider_services").select("category_slug, base_price").eq("provider_id", user.id),
        supabase.from("provider_service_areas").select("city_slug").eq("provider_id", user.id),
      ]);
      if (p) {
        setBiz({
          business_name: p.business_name ?? "",
          business_type: (p.business_type as "individual" | "business") ?? "individual",
          bio: p.bio ?? "",
          years_experience: p.years_experience ?? 0,
          supports_urgent: !!p.supports_urgent,
        });
      }
      const m: Record<string, string> = {};
      (svcs ?? []).forEach((s) => (m[s.category_slug] = s.base_price?.toString() ?? ""));
      setBizCats(m);
      const c: Record<string, boolean> = {};
      (areas ?? []).forEach((a) => (c[a.city_slug] = true));
      setBizCities(c);
    })();
  }, [user, isProvider]);

  const toggleBizCat = (slug: string) =>
    setBizCats((c) => {
      const n = { ...c };
      if (slug in n) delete n[slug];
      else n[slug] = "";
      return n;
    });

  const saveBusiness = async () => {
    if (!user) return;
    setSavingBiz(true);
    setBizMsg(null);
    try {
      await saveProviderProfile(user.id, {
        business_name: biz.business_name,
        business_type: biz.business_type,
        bio: biz.bio,
        years_experience: biz.years_experience,
        supports_urgent: biz.supports_urgent,
        services: bizCats,
        cities: bizCities,
      });
      setBizMsg(L("Saved!", "သိမ်းပြီး!"));
    } catch (e: any) {
      setBizMsg(e?.message ?? "Failed to save");
    } finally {
      setSavingBiz(false);
    }
  };

  const saveProfile = async () => {
    if (!user || !profile) return;
    setSavingProfile(true);
    setProfileMsg(null);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: profile.full_name,
      phone: profile.phone,
      preferred_language: profile.preferred_language ?? lang,
    });
    setSavingProfile(false);
    setProfileMsg(error ? error.message : L("Saved!", "သိမ်းပြီး!"));
  };

  const addAddress = async () => {
    if (!user || !draft.label) return;
    const { data, error } = await supabase
      .from("saved_addresses")
      .insert({
        user_id: user.id,
        label: draft.label!,
        city_slug: draft.city_slug ?? null,
        area: draft.area ?? null,
        address: draft.address ?? null,
        landmark: draft.landmark ?? null,
        phone: draft.phone ?? null,
        is_default: !!draft.is_default,
      })
      .select("id, label, city_slug, area, address, landmark, phone, is_default")
      .single();
    if (!error && data) {
      setAddrs((cur) => [data as Address, ...cur]);
      setShowAddr(false);
      setDraft({ label: "", city_slug: "yangon", area: "", address: "", landmark: "", phone: "", is_default: false });
    }
  };

  const deleteAddr = async (id: string) => {
    await supabase.from("saved_addresses").delete().eq("id", id);
    setAddrs((cur) => cur.filter((x) => x.id !== id));
  };

  const makeDefault = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.rpc("set_default_address", { p_address_id: id });
    if (error) { toast.error(error.message); return; }
    setAddrs((cur) =>
      cur
        .map((x) => ({ ...x, is_default: x.id === id }))
        .sort((a, b) => Number(b.is_default) - Number(a.is_default)),
    );
  };

  const removeFav = async (providerId: string) => {
    if (!user) return;
    await supabase
      .from("favorites")
      .delete()
      .eq("customer_id", user.id)
      .eq("provider_id", providerId);
    setFavs((cur) => cur.filter((f) => f.provider_id !== providerId));
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">

        <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <LoadingState label={L("Loading…", "တင်နေ…")} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-5 sm:px-6 sm:py-10">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {L("Account", "ကျွန်ုပ်၏ အကောင့်")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={async () => {
              await signOut();
            }}
          >
            <LogOut className="mr-1 h-4 w-4" />
            {L("Sign out", "ထွက်ရန်")}
          </Button>
        </div>

        <Tabs defaultValue="profile">
          <TabsList className={`grid w-full ${isProvider ? "grid-cols-4" : "grid-cols-3"}`}>
            <TabsTrigger value="profile">{L("Profile", "ပရိုဖိုင်")}</TabsTrigger>
            {isProvider && (
              <TabsTrigger value="business">{L("Business", "လုပ်ငန်း")}</TabsTrigger>
            )}
            <TabsTrigger value="addresses">{L("Addresses", "လိပ်စာ")}</TabsTrigger>
            <TabsTrigger value="favorites">{L("Favorites", "နှစ်သက်")}</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4 space-y-4 rounded-2xl border border-border bg-card p-5">
            <div className="space-y-2">
              <Label>{L("Full name", "အမည်အပြည့်")}</Label>
              <Input
                value={profile?.full_name ?? ""}
                onChange={(e) => setProfile((p) => (p ? { ...p, full_name: e.target.value } : p))}
                placeholder={L("Your name", "သင့်အမည်")}
              />
            </div>
            <div className="space-y-2">
              <Label>{L("Phone", "ဖုန်း")}</Label>
              <Input
                value={profile?.phone ?? ""}
                onChange={(e) => setProfile((p) => (p ? { ...p, phone: e.target.value } : p))}
                placeholder="09xxxxxxxxx"
                inputMode="tel"
              />
              <p className="text-xs text-muted-foreground">
                {L(
                  "Shared with the provider only after you accept a quote.",
                  "စျေးနှုန်း လက်ခံပြီးမှသာ ပညာရှင်ထံ ပေးပါမည်။",
                )}
              </p>
            </div>
            <div className="space-y-2">
              <Label>{L("Preferred Language", "နှစ်သက်သော ဘာသာစကား")}</Label>
              <div className="flex gap-2 rounded-lg bg-secondary p-1">
                {(["en", "my"] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setProfile((p) => (p ? { ...p, preferred_language: code } : p));
                      setLang(code);
                    }}
                    className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                      profile?.preferred_language === code
                        ? "bg-card shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    {code === "en" ? "English" : "မြန်မာ"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {L(
                  "This will be your default language when you sign in.",
                  "ဝင်ရောက်သည့်အခါ မူရင်းဘာသာစကား အဖြစ်အသုံးပြုပါမည်။",
                )}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <Button size="lg" onClick={saveProfile} disabled={savingProfile}>
                {savingProfile ? L("Saving…", "သိမ်းနေ…") : L("Save", "သိမ်းရန်")}
              </Button>
              {profileMsg && <span className="text-xs text-muted-foreground">{profileMsg}</span>}
            </div>
          </TabsContent>

          {isProvider && (
          <TabsContent value="business" className="mt-4 space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{L("Business profile", "လုပ်ငန်း ပရိုဖိုင်")}</span>
              </div>
              <div className="space-y-2">
                <Label>{L("Business or your name", "လုပ်ငန်း သို့ သင့်အမည်")}</Label>
                <Input
                  value={biz.business_name}
                  onChange={(e) => setBiz((b) => ({ ...b, business_name: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 rounded-lg bg-secondary p-1">
                {(["individual", "business"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setBiz((b) => ({ ...b, business_type: t }))}
                    className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
                      biz.business_type === t ? "bg-card shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    {t === "individual"
                      ? L("Individual", "တစ်ဦးတည်း")
                      : L("Business", "လုပ်ငန်း")}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <Label>{L("Short bio", "မိတ်ဆက်")}</Label>
                <Textarea
                  rows={3}
                  value={biz.bio}
                  onChange={(e) => setBiz((b) => ({ ...b, bio: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{L("Years of experience", "အတွေ့အကြုံ နှစ်")}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={biz.years_experience}
                    onChange={(e) =>
                      setBiz((b) => ({ ...b, years_experience: Number(e.target.value) }))
                    }
                  />
                </div>
                <label className="mt-6 flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={biz.supports_urgent}
                    onCheckedChange={(v) =>
                      setBiz((b) => ({ ...b, supports_urgent: !!v }))
                    }
                  />
                  {L("Accept urgent same-day jobs", "အရေးပေါ် တနေ့တည်း လက်ခံ")}
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <div className="text-sm font-semibold">
                {L("Services offered & base price (MMK)", "ဝန်ဆောင်မှု နှင့် အခြေခံစျေး (ကျပ်)")}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {CATEGORIES.map((c) => {
                  const active = c.slug in bizCats;
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
                          onCheckedChange={() => toggleBizCat(c.slug)}
                        />
                        {lang === "en" ? c.en : c.my}
                      </label>
                      {active && (
                        <Input
                          className="mt-2 h-8 text-sm"
                          placeholder={L("Base price (optional)", "အခြေခံစျေး (ရွေး)")}
                          value={bizCats[c.slug]}
                          onChange={(e) =>
                            setBizCats((s) => ({ ...s, [c.slug]: e.target.value }))
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <div className="text-sm font-semibold">
                {L("Service areas (cities)", "ဝန်ဆောင်ပေးသော နယ်မြေ")}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CITIES.map((c) => (
                  <label
                    key={c.slug}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-sm transition ${
                      bizCities[c.slug] ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <Checkbox
                      checked={!!bizCities[c.slug]}
                      onCheckedChange={(v) =>
                        setBizCities((s) => ({ ...s, [c.slug]: !!v }))
                      }
                    />
                    {lang === "en" ? c.en : c.my}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {L(
                  "Township-level details belong on each saved address (Addresses tab).",
                  "မြို့နယ်အလိုက် အသေးစိတ်ကို လိပ်စာ tab တွင် ထည့်ပါ။",
                )}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Button size="lg" onClick={saveBusiness} disabled={savingBiz}>
                {savingBiz ? L("Saving…", "သိမ်းနေ…") : L("Save business", "သိမ်းရန်")}
              </Button>
              {bizMsg && <span className="text-xs text-muted-foreground">{bizMsg}</span>}
            </div>
          </TabsContent>
          )}

          <TabsContent value="addresses" className="mt-4 space-y-3">
            {addrs.length === 0 && !showAddr && (
              <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
                <MapPin className="mx-auto h-9 w-9 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  {L("No saved addresses yet.", "သိမ်းထားသော လိပ်စာ မရှိသေး။")}
                </p>
              </div>
            )}
            <ul className="space-y-2">
              {addrs.map((a) => {
                const city = CITIES.find((c) => c.slug === a.city_slug);
                return (
                  <li key={a.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{a.label}</span>
                          {a.is_default && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                              {L("Default", "မူရင်း")}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {city ? (lang === "en" ? city.en : city.my) : a.city_slug}
                          {a.area ? ` · ${a.area}` : ""}
                        </p>
                        {a.address && <p className="mt-1 text-sm">{a.address}</p>}
                        {a.landmark && (
                          <p className="text-xs text-muted-foreground">{a.landmark}</p>
                        )}
                        {a.phone && <p className="mt-1 text-xs">📞 {a.phone}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {!a.is_default && (
                          <button
                            onClick={() => makeDefault(a.id)}
                            className="text-xs text-primary hover:underline"
                          >
                            {L("Set default", "မူရင်းထား")}
                          </button>
                        )}
                        <button
                          onClick={() => deleteAddr(a.id)}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {showAddr ? (
              <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
                <Input
                  placeholder={L("Label (Home, Office…)", "အညွှန်း (အိမ်၊ ရုံး…)")}
                  value={draft.label ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={draft.city_slug ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, city_slug: e.target.value, area: "" }))
                    }
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {CITIES.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {lang === "en" ? c.en : c.my}
                      </option>
                    ))}
                  </select>
                  <select
                    value={draft.area ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, area: e.target.value }))}
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">{L("Select township", "မြို့နယ် ရွေးပါ")}</option>
                    {(TOWNSHIPS[draft.city_slug ?? ""] ?? []).map((t) => (
                      <option key={t.slug} value={lang === "en" ? t.en : t.my}>
                        {lang === "en" ? t.en : t.my}
                      </option>
                    ))}
                    <option value="other">{L("Other", "အခြား")}</option>
                  </select>
                </div>
                <Input
                  placeholder={L("Street address", "လမ်းလိပ်စာ")}
                  value={draft.address ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
                />
                <Input
                  placeholder={L("Landmark (optional)", "မှတ်တိုင် (ရွေး)")}
                  value={draft.landmark ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, landmark: e.target.value }))}
                />
                <Input
                  placeholder={L("Contact phone", "ဆက်သွယ်ရန် ဖုန်း")}
                  value={draft.phone ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                  inputMode="tel"
                />
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={!!draft.is_default}
                    onChange={(e) => setDraft((d) => ({ ...d, is_default: e.target.checked }))}
                  />
                  {L("Set as default", "မူရင်းအဖြစ်ထား")}
                </label>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowAddr(false)}>
                    {L("Cancel", "ပယ်ဖျက်")}
                  </Button>
                  <Button size="lg" onClick={addAddress} disabled={!draft.label}>
                    {L("Save address", "သိမ်းရန်")}
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" className="w-full" onClick={() => setShowAddr(true)}>
                <Plus className="mr-1 h-4 w-4" />
                {L("Add address", "လိပ်စာ ထည့်ရန်")}
              </Button>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="mt-4 space-y-3">
            {favs.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
                <Heart className="mx-auto h-9 w-9 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  {L(
                    "Save providers you trust to rebook them faster.",
                    "ယုံကြည်ရသော ပညာရှင်များကို သိမ်းပါ။",
                  )}
                </p>
                <Link to="/providers" search={{ cat: "", city: "" }} className="mt-4 inline-block">
                  <Button size="sm" variant="outline">
                    {L("Browse providers", "ပညာရှင်များ ရှာရန်")}
                  </Button>
                </Link>
              </div>
            )}
            <ul className="space-y-2">
              {favs.map((f) => {
                const p = f.provider;
                if (!p) return null;
                return (
                  <li
                    key={f.provider_id}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
                  >
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-secondary text-base font-bold text-primary">
                      {(p.business_name ?? "?").slice(0, 1)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/p/$providerId"
                        params={{ providerId: p.id }}
                        className="flex items-center gap-1 truncate text-sm font-semibold hover:text-primary"
                      >
                        {p.business_name ?? "Provider"}
                        {p.is_verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                      </Link>
                      <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="h-3 w-3 fill-primary text-primary" />
                        {p.rating_avg.toFixed(1)} ({p.rating_count})
                      </div>
                    </div>
                    <Link to="/request/new">
                      <Button size="sm" variant="outline">
                        {L("Rebook", "ပြန်ဘွတ်")}
                      </Button>
                    </Link>
                    <button
                      onClick={() => removeFav(f.provider_id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </TabsContent>
        </Tabs>
      </main>

    </div>
  );
}