import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export function PackagesTab() {
  const [rows, setRows] = useState<any[] | null>(null);
  const load = async () => {
    const { data } = await supabase.from("credit_packages").select("*").order("sort_order");
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);
  const save = async (id: string, patch: any) => {
    const { error } = await supabase.from("credit_packages")
      .update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Saved"); load(); }
  };
  if (!rows) return <Skeleton className="mt-4 h-48 w-full" />;
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="hidden grid-cols-[1.5fr_1fr_1fr_1fr_1.2fr_auto] gap-3 border-b border-border bg-muted/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
        <span>Name</span>
        <span>Price MMK</span>
        <span>Credits</span>
        <span>Bonus</span>
        <span>Badge</span>
        <span className="text-right">Active</span>
      </div>
      <div className="divide-y divide-border">
        {rows.map((p) => <PackageRow key={p.id} row={p} onSave={save} />)}
      </div>
      <p className="border-t border-border bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
        Changes save automatically when you leave a field. Add new packages via SQL.
      </p>
    </div>
  );
}

function PackageRow({ row, onSave }: { row: any; onSave: (id: string, p: any) => void }) {
  const [name, setName] = useState(row.name_en ?? "");
  const [price, setPrice] = useState<number>(row.price_mmk ?? 0);
  const [credits, setCredits] = useState<number>(row.credits ?? 0);
  const [bonus, setBonus] = useState<number>(row.bonus_credits ?? 0);
  const [badge, setBadge] = useState<string>(row.badge_en ?? "");
  const [active, setActive] = useState<boolean>(row.is_active);
  const saveIf = (field: string, value: any, original: any) => {
    if (value === original || value === (original ?? "") || value === (original ?? 0)) return;
    onSave(row.id, { [field]: value });
  };
  return (
    <div className="grid grid-cols-2 gap-3 px-4 py-3 sm:grid-cols-[1.5fr_1fr_1fr_1fr_1.2fr_auto] sm:items-center">
      <div className="col-span-2 sm:col-span-1">
        <label className="text-[10px] uppercase text-muted-foreground sm:hidden">Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => saveIf("name_en", name, row.name_en ?? "")} className="h-9" />
      </div>
      <div>
        <label className="text-[10px] uppercase text-muted-foreground sm:hidden">Price MMK</label>
        <Input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} onBlur={() => saveIf("price_mmk", price, row.price_mmk ?? 0)} className="h-9" />
      </div>
      <div>
        <label className="text-[10px] uppercase text-muted-foreground sm:hidden">Credits</label>
        <Input type="number" value={credits} onChange={(e) => setCredits(Number(e.target.value))} onBlur={() => saveIf("credits", credits, row.credits ?? 0)} className="h-9" />
      </div>
      <div>
        <label className="text-[10px] uppercase text-muted-foreground sm:hidden">Bonus</label>
        <Input type="number" value={bonus} onChange={(e) => setBonus(Number(e.target.value))} onBlur={() => saveIf("bonus_credits", bonus, row.bonus_credits ?? 0)} className="h-9" />
      </div>
      <div className="col-span-2 sm:col-span-1">
        <label className="text-[10px] uppercase text-muted-foreground sm:hidden">Badge</label>
        <Input value={badge} onChange={(e) => setBadge(e.target.value)} onBlur={() => saveIf("badge_en", badge || null, row.badge_en ?? "")} placeholder="e.g. Popular" className="h-9" />
      </div>
      <div className="col-span-2 flex items-center justify-end gap-2 sm:col-span-1">
        <Switch checked={active} onCheckedChange={(v) => { setActive(v); onSave(row.id, { is_active: v }); }} />
        <span className="text-xs font-medium text-muted-foreground">{active ? "Active" : "Off"}</span>
      </div>
    </div>
  );
}