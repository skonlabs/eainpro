import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OverviewTab } from "@/components/admin/OverviewTab";
import { PricingTab } from "@/components/admin/PricingTab";
import { TopupsTab } from "@/components/admin/TopupsTab";
import { RefundsTab } from "@/components/admin/RefundsTab";
import { RefundRequestsTab } from "@/components/admin/RefundRequestsTab";
import { VerificationTab } from "@/components/admin/VerificationTab";
import { ReportsTab } from "@/components/admin/ReportsTab";
import { RevenueTab } from "@/components/admin/RevenueTab";
import { AuditTab } from "@/components/admin/AuditTab";
import { ProvidersTab } from "@/components/admin/ProvidersTab";
import { LeadsTab } from "@/components/admin/LeadsTab";
import { CustomersTab } from "@/components/admin/CustomersTab";
import { PaymentMethodsTab } from "@/components/admin/PaymentMethodsTab";
import { PackagesTab } from "@/components/admin/PackagesTab";
import { AdjustWalletTab } from "@/components/admin/AdjustWalletTab";
import { LoadingState } from "@/components/site/LoadingState";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin — Fixido" }] }),
});

function AdminPage() {
  const { lang } = useI18n();
  const { user, roles, loading } = useAuth();
  const nav = useNavigate();
  const isAdmin = roles.includes("admin");
  const [tab, setTab] = useState<string>("overview");

  useEffect(() => {
    if (loading) return;
    if (!user) nav({ to: "/signin", search: { redirect: "/admin" } });
  }, [loading, user, nav]);

  if (loading || !user) return <LoadingState label={lang === "en" ? "Loading…" : "ခဏစောင့်ပါ…"} />;
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background p-8 text-center">
        <h1 className="text-xl font-bold">Admin only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {lang === "en"
            ? "Your account does not have the admin role."
            : "သင်၏ အကောင့်တွင် admin role မရှိပါ။"}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Admin console</h1>
        <Tabs value={tab} onValueChange={setTab}>
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            <TabsList className="inline-flex h-auto w-max gap-1 p-1">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="pricing">Lead pricing</TabsTrigger>
              <TabsTrigger value="topups">Top-ups</TabsTrigger>
              <TabsTrigger value="refunds">Refunds</TabsTrigger>
              <TabsTrigger value="refund-requests">Refund requests</TabsTrigger>
              <TabsTrigger value="verification">Verification</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="audit">Audit log</TabsTrigger>
              <TabsTrigger value="providers">Providers</TabsTrigger>
              <TabsTrigger value="leads">Leads</TabsTrigger>
              <TabsTrigger value="customers">Customers</TabsTrigger>
              <TabsTrigger value="payments">Payment methods</TabsTrigger>
              <TabsTrigger value="packages">Packages</TabsTrigger>
              <TabsTrigger value="adjust">Adjust wallet</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="overview"><OverviewTab onJump={setTab} /></TabsContent>
          <TabsContent value="pricing"><PricingTab /></TabsContent>
          <TabsContent value="topups"><TopupsTab /></TabsContent>
          <TabsContent value="refunds"><RefundsTab /></TabsContent>
          <TabsContent value="refund-requests"><RefundRequestsTab /></TabsContent>
          <TabsContent value="verification"><VerificationTab /></TabsContent>
          <TabsContent value="reports"><ReportsTab /></TabsContent>
          <TabsContent value="revenue"><RevenueTab /></TabsContent>
          <TabsContent value="audit"><AuditTab /></TabsContent>
          <TabsContent value="providers"><ProvidersTab /></TabsContent>
          <TabsContent value="leads"><LeadsTab /></TabsContent>
          <TabsContent value="customers"><CustomersTab /></TabsContent>
          <TabsContent value="payments"><PaymentMethodsTab /></TabsContent>
          <TabsContent value="packages"><PackagesTab /></TabsContent>
          <TabsContent value="adjust"><AdjustWalletTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}