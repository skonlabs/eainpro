import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

const METHOD_SLUGS = ["kbzpay", "ayapay", "cbpay", "wavepay"] as const;

export function PaymentMethodsTab() {
  const [rows, setRows] = useState<any[] | null>(null);
  const load = async () => {
    const { data } = await supabase
      .from("payment_methods")
      .select("*")
      .in("slug", METHOD_SLUGS as unknown as string[])
      .order("slug");
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);
  const save = async (slug: string, patch: any) => {
    const { error } = await supabase
      .from("payment_methods")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("slug", slug);
    if (error) toast.error(error.message);
    else { toast.success("Saved"); load(); }
  };
  if (!rows) return <Skeleton className="mt-4 h-48 w-full" />;
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      {rows.map((r) => <PaymentMethodCard key={r.slug} row={r} onSave={save} />)}
    </div>
  );
}

function PaymentMethodCard({ row, onSave }: { row: any; onSave: (slug: string, patch: any) => void }) {
  const [phone, setPhone] = useState(row.phone_number ?? "");
  const [name, setName] = useState(row.account_name ?? "");
  const [payload, setPayload] = useState(row.qr_payload ?? "");
  const [active, setActive] = useState<boolean>(row.is_active);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(row.qr_image_url ?? null);
  const [uploading, setUploading] = useState(false);
  const qrValue = payload.trim() || phone.trim();

  const uploadQr = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${row.slug}-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("payment-qr").upload(path, file, {
        contentType: file.type,
        upsert: true,
      });
      if (up.error) throw up.error;
      const { data } = supabase.storage.from("payment-qr").getPublicUrl(path);
      setQrImageUrl(data.publicUrl);
      onSave(row.slug, { qr_image_url: data.publicUrl });
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const downloadGenerated = () => {
    const svg = document.getElementById(`qr-${row.slug}`);
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${row.slug}-qr.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold">{row.label}</div>
        <div className="flex items-center gap-2 text-xs">
          <span>Active</span>
          <Switch checked={active} onCheckedChange={(v) => { setActive(v); onSave(row.slug, { is_active: v }); }} />
        </div>
      </div>
      <div>
        <Label className="text-xs">Phone number</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xxxxxxxxx" />
      </div>
      <div>
        <Label className="text-xs">Account name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Account holder" />
      </div>
      <div>
        <Label className="text-xs">QR payload (optional — overrides phone)</Label>
        <Input value={payload} onChange={(e) => setPayload(e.target.value)} placeholder="Paste app QR string" />
      </div>

      <div className="rounded-lg border border-dashed border-border p-3 space-y-2">
        <div className="text-xs font-semibold">QR shown to providers</div>
        {qrImageUrl ? (
          <div className="space-y-2">
            <div className="flex justify-center rounded-lg bg-white p-3">
              <img src={qrImageUrl} alt={`${row.label} QR`} className="h-40 w-40 object-contain" />
            </div>
            <p className="text-[10px] text-muted-foreground text-center">Uploaded image (preferred — works with real wallet apps)</p>
            <Button size="sm" variant="ghost" className="w-full"
              onClick={() => { setQrImageUrl(null); onSave(row.slug, { qr_image_url: null }); }}>
              Remove uploaded QR
            </Button>
          </div>
        ) : qrValue ? (
          <div className="space-y-2">
            <div className="flex justify-center rounded-lg bg-white p-3">
              <QRCodeSVG id={`qr-${row.slug}`} value={qrValue} size={140} />
            </div>
            <p className="text-[10px] text-muted-foreground text-center">Generated from {payload.trim() ? "QR payload" : "phone number"}</p>
            <Button size="sm" variant="ghost" className="w-full" onClick={downloadGenerated}>
              Download SVG
            </Button>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground text-center py-6">Enter phone, paste QR payload, or upload a QR image below.</p>
        )}
        <div>
          <Label className="text-xs">Upload QR image (PNG/JPG from wallet app)</Label>
          <Input type="file" accept="image/*" disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadQr(f); }} />
          <p className="mt-1 text-[10px] text-muted-foreground">Recommended: export the QR from KBZPay/AyaPay/etc. so providers can scan it directly.</p>
        </div>
      </div>

      <Button size="sm" className="w-full" onClick={() => onSave(row.slug, { phone_number: phone, account_name: name, qr_payload: payload })}>
        Save
      </Button>
    </div>
  );
}