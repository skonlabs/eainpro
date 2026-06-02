import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export function PricingTab() {
  const [rows, setRows] = useState<any[] | null>(null);
  const load = async () => {
    const { data } = await supabase
      .from("lead_pricing")
      .select("*, service_types(category_slug, slug, name_en, is_active)")
      .order("price_credits", { ascending: true });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);
  const save = async (id: string, patch: any) => {
    const { data, error } = await supabase
      .from("lead_pricing")
      .update(patch)
      .eq("id", id)
      .select();
    if (error) {
      toast.error(error.message);
    } else if (!data || data.length === 0) {
      toast.error("Update blocked (admin permission required).");
    } else {
      toast.success("Saved");
    }
    load();
  };
  if (!rows) return <Skeleton className="mt-4 h-64 w-full" />;
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase">
          <tr>
            <th className="p-3">Service</th>
            <th className="p-3">Price (credits)</th>
            <th className="p-3">Max unlocks</th>
            <th className="p-3">Refund</th>
          <th className="p-3" title="When off, providers can no longer unlock new leads for this service. Existing leads are unaffected.">Active</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <PricingRow key={r.id} row={r} onSave={save} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PricingRow({ row, onSave }: { row: any; onSave: (id: string, p: any) => void }) {
  const [price, setPrice] = useState(row.price_credits);
  const [max, setMax] = useState(row.max_provider_unlocks);
  const [active, setActive] = useState<boolean>(!!row.is_active);
  const [refund, setRefund] = useState<boolean>(!!row.refund_allowed);
  useEffect(() => { setActive(!!row.is_active); }, [row.is_active]);
  useEffect(() => { setRefund(!!row.refund_allowed); }, [row.refund_allowed]);
  return (
    <tr className="border-t border-border">
      <td className="p-3">
        <div className="font-medium">{row.service_types?.name_en ?? "—"}</div>
        <div className="text-xs text-muted-foreground">{row.service_types?.category_slug}/{row.service_types?.slug}</div>
      </td>
      <td className="p-3">
        <Input type="number" min={0} className="w-28" value={price} onChange={(e) => setPrice(Math.max(0, parseInt(e.target.value || "0", 10)))} onBlur={() => price !== row.price_credits && onSave(row.id, { price_credits: price })} />
      </td>
      <td className="p-3">
        <Input type="number" min={1} className="w-20" value={max} onChange={(e) => setMax(Math.max(1, parseInt(e.target.value || "1", 10)))} onBlur={() => max !== row.max_provider_unlocks && onSave(row.id, { max_provider_unlocks: max })} />
      </td>
      <td className="p-3">
        <Switch checked={refund} onCheckedChange={(v) => { setRefund(v); onSave(row.id, { refund_allowed: v }); }} />
      </td>
      <td className="p-3">
        <Switch checked={active} onCheckedChange={(v) => { setActive(v); onSave(row.id, { is_active: v }); }} />
      </td>
    </tr>
  );
}