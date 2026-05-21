import { Link } from "@tanstack/react-router";
import { ChevronRight, Shield } from "lucide-react";
import { Greeting, type Lfn } from "./atoms";

export function AdminHome({ name, L }: { name: string; L: Lfn }) {
  return (
    <div className="space-y-4">
      <Greeting name={name} sub={L("Admin overview.", "Admin ခြုံငုံကြည့်ရှုမှု")} />
      <Link
        to="/admin"
        className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:border-primary/50"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <Shield className="h-5 w-5" />
          </span>
          <div>
            <div className="font-semibold">{L("Open admin", "Admin ဖွင့်ရန်")}</div>
            <div className="text-xs text-muted-foreground">
              {L("Users, jobs, settings", "အသုံးပြုသူ၊ အလုပ်၊ ဆက်တင်")}
            </div>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </Link>
    </div>
  );
}