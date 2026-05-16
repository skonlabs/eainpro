import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { CITIES } from "@/lib/catalog";
import { Heart, MapPin, Plus, Star, Trash2, BadgeCheck, LogOut } from "lucide-react";

export const Route = createFileRoute("/account")({
  component: AccountPage,
  head: () => ({ meta: [{ title: "Account — Eain Pro" }] }),
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
  const { user, loading: authLoading, signOut } = useAuth();
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
    await supabase.from("saved_addresses").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("saved_addresses").update({ is_default: true }).eq("id", id);
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
          <p className="text-sm text-muted-foreground">{L("Loading…", "တင်နေ…")}</p>
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
              nav({ to: "/" });
            }}
          >
            <LogOut className="mr-1 h-4 w-4" />
            {L("Sign out", "ထွက်ရန်")}
          </Button>
        </div>

        <Tabs defaultValue="profile">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">{L("Profile", "ပရိုဖိုင်")}</TabsTrigger>
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
              <Label>{L("Language", "ဘာသာစကား")}</Label>
              <div className="flex gap-2">
                {(["en", "my"] as const).map((code) => (
                  <Button
                    key={code}
                    type="button"
                    variant={profile?.preferred_language === code ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setProfile((p) => (p ? { ...p, preferred_language: code } : p));
                      setLang(code);
                    }}
                  >
                    {code === "en" ? "English" : "မြန်မာ"}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Button onClick={saveProfile} disabled={savingProfile}>
                {savingProfile ? L("Saving…", "သိမ်းနေ…") : L("Save", "သိမ်းရန်")}
              </Button>
              {profileMsg && <span className="text-xs text-muted-foreground">{profileMsg}</span>}
            </div>
          </TabsContent>

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
                    onChange={(e) => setDraft((d) => ({ ...d, city_slug: e.target.value }))}
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {CITIES.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {lang === "en" ? c.en : c.my}
                      </option>
                    ))}
                  </select>
                  <Input
                    placeholder={L("Area / Township", "မြို့နယ်")}
                    value={draft.area ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, area: e.target.value }))}
                  />
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
                  <Button size="sm" onClick={addAddress} disabled={!draft.label}>
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
                <Link to="/providers" className="mt-4 inline-block">
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