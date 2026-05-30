import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { Star, User, ArrowLeft } from "lucide-react";
import { LoadingState } from "@/components/site/LoadingState";

export const Route = createFileRoute("/c/$customerId")({ component: CustomerPublicReviewsPage });

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  provider_id: string;
  provider?: { business_name: string | null } | null;
};

function CustomerPublicReviewsPage() {
  const { customerId } = Route.useParams();
  const { lang } = useI18n();
  const L = (en: string, my: string) => (lang === "en" ? en : my);

  const { data: reviews } = useQuery({
    queryKey: ["customer-public-reviews", customerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, provider_id, provider:providers(business_name)")
        .eq("customer_id", customerId)
        .eq("rated_by", "provider")
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as ReviewRow[];
    },
  });

  const avg = reviews && reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-14">
        <button
          type="button"
          onClick={() => history.back()}
          className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {L("Back", "နောက်")}
        </button>
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              {L("Customer reviews", "ဖောက်သည် သုံးသပ်ချက်များ")}
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              {L("Reviews from providers", "ပညာရှင်များ၏ သုံးသပ်ချက်")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {L("What providers say about this customer.", "ဤဖောက်သည်အကြောင်း ပညာရှင်များ၏ မှတ်ချက်")}
            </p>
          </div>
          {avg != null && (
            <div className="text-right">
              <div className="inline-flex items-center gap-1 text-lg font-bold">
                <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                {avg.toFixed(1)}
              </div>
              <div className="text-[11px] text-muted-foreground">{reviews!.length} {L("reviews", "ခု")}</div>
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
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={`h-4 w-4 ${n <= r.rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground"}`} />
                      ))}
                    </div>
                    {r.provider?.business_name && (
                      <Link
                        to="/p/$providerId"
                        params={{ providerId: r.provider_id }}
                        className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                      >
                        {r.provider.business_name}
                      </Link>
                    )}
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