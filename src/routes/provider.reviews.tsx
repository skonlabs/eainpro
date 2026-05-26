import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useRoleGuard } from "@/lib/use-role-guard";
import { useI18n } from "@/lib/i18n";
import { Star } from "lucide-react";
import { LoadingState } from "@/components/site/LoadingState";

export const Route = createFileRoute("/provider/reviews")({ component: ReviewsPage });

type ReviewRow = { id: string; rating: number; comment: string | null; created_at: string };

function ReviewsPage() {
  const { lang } = useI18n();
  const { user, loading } = useAuth();
  const guard = useRoleGuard("provider");
  const nav = useNavigate();
  const L = (en: string, my: string) => (lang === "en" ? en : my);

  const { data } = useQuery({
    queryKey: ["provider-all-reviews", user?.id],
    enabled: !!user && guard.allowed,
    queryFn: async () => {
      const [{ data: prov }, { data: rvs }] = await Promise.all([
        supabase.from("providers").select("rating_avg, rating_count").eq("id", user!.id).maybeSingle(),
        supabase
          .from("reviews")
          .select("id, rating, comment, created_at")
          .eq("provider_id", user!.id)
          .eq("rated_by", "customer")
          .order("created_at", { ascending: false }),
      ]);
      return { prov, reviews: (rvs ?? []) as ReviewRow[] };
    },
  });

  const reviews = data?.reviews;
  const ratingAvg = data?.prov?.rating_avg ?? null;
  const ratingCount = data?.prov?.rating_count ?? reviews?.length ?? 0;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-14">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{L("Reviews & ratings", "သုံးသပ်ချက်များ")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{L("All customer reviews, newest first.", "ဖောက်သည် သုံးသပ်ချက် အားလုံး")}</p>
          </div>
          {ratingAvg != null && (
            <div className="text-right">
              <div className="inline-flex items-center gap-1 text-lg font-bold">
                <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                {Number(ratingAvg).toFixed(1)}
              </div>
              <div className="text-[11px] text-muted-foreground">{ratingCount} {L("reviews", "ခု")}</div>
            </div>
          )}
        </div>

        {reviews === undefined ? (
          <LoadingState label={L("Loading…", "ခဏစောင့်ပါ…")} className="mt-6 min-h-[20vh]" />
        ) : reviews.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {L("No reviews yet.", "သုံးသပ်ချက် မရှိသေး။")}
          </p>
        ) : (
          <ul className="mt-6 space-y-2">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-xl border border-border bg-card p-4 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={`h-4 w-4 ${n <= r.rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground"}`} />
                    ))}
                  </div>
                  <span className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                </div>
                {r.comment && <p className="mt-2 text-muted-foreground">{r.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}