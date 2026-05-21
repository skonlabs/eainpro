import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  LayoutDashboard,
  Tag,
  Wallet,
  Undo2,
  HandCoins,
  BadgeCheck,
  Flag,
  LineChart,
  ScrollText,
  Briefcase,
  Inbox,
  Users,
  CreditCard,
  Package,
  Coins,
  Shield,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
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
  validateSearch: z.object({ tab: z.string().optional() }),
});

type TabKey =
  | "overview"
  | "revenue"
  | "topups"
  | "refunds"
  | "refund-requests"
  | "adjust"
  | "pricing"
  | "packages"
  | "payments"
  | "providers"
  | "customers"
  | "leads"
  | "verification"
  | "reports"
  | "audit";

type NavItem = { key: TabKey; label: string; icon: typeof LayoutDashboard; subtitle?: string };
type NavSection = { label: string; items: NavItem[] };

const SECTIONS: NavSection[] = [
  {
    label: "Insights",
    items: [
      { key: "overview", label: "Overview", icon: LayoutDashboard, subtitle: "Key metrics at a glance" },
      { key: "revenue", label: "Revenue", icon: LineChart, subtitle: "Earnings, splits, trends" },
    ],
  },
  {
    label: "Money",
    items: [
      { key: "topups", label: "Top-ups", icon: Wallet, subtitle: "Approve provider top-up requests" },
      { key: "refunds", label: "Refunds", icon: Undo2, subtitle: "Issue lead refunds" },
      { key: "refund-requests", label: "Refund requests", icon: HandCoins, subtitle: "Customer & provider refund queue" },
      { key: "adjust", label: "Adjust wallet", icon: Coins, subtitle: "Manual credit / debit" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { key: "pricing", label: "Lead pricing", icon: Tag, subtitle: "Per-service unlock pricing" },
      { key: "packages", label: "Packages", icon: Package, subtitle: "Credit top-up bundles" },
      { key: "payments", label: "Payment methods", icon: CreditCard, subtitle: "Accepted payment options" },
    ],
  },
  {
    label: "People",
    items: [
      { key: "providers", label: "Providers", icon: Briefcase, subtitle: "Verify, suspend, block" },
      { key: "customers", label: "Customers", icon: Users, subtitle: "Homeowners & block controls" },
      { key: "leads", label: "Leads", icon: Inbox, subtitle: "Inspect all incoming leads" },
    ],
  },
  {
    label: "Trust & system",
    items: [
      { key: "verification", label: "Verification", icon: BadgeCheck, subtitle: "Provider documents queue" },
      { key: "reports", label: "Reports", icon: Flag, subtitle: "Abuse & dispute reports" },
      { key: "audit", label: "Audit log", icon: ScrollText, subtitle: "Every admin action" },
    ],
  },
];

const ALL_ITEMS: NavItem[] = SECTIONS.flatMap((s) => s.items);

function tabComponent(key: TabKey, setTab: (k: TabKey) => void) {
  switch (key) {
    case "overview": return <OverviewTab onJump={(t) => setTab(t as TabKey)} />;
    case "revenue": return <RevenueTab />;
    case "topups": return <TopupsTab />;
    case "refunds": return <RefundsTab />;
    case "refund-requests": return <RefundRequestsTab />;
    case "adjust": return <AdjustWalletTab />;
    case "pricing": return <PricingTab />;
    case "packages": return <PackagesTab />;
    case "payments": return <PaymentMethodsTab />;
    case "providers": return <ProvidersTab />;
    case "customers": return <CustomersTab />;
    case "leads": return <LeadsTab />;
    case "verification": return <VerificationTab />;
    case "reports": return <ReportsTab />;
    case "audit": return <AuditTab />;
  }
}

function AdminPage() {
  const { lang } = useI18n();
  const { user, roles, loading } = useAuth();
  const nav = useNavigate();
  const isAdmin = roles.includes("admin");
  const { tab: tabParam } = Route.useSearch();
  const initial = (ALL_ITEMS.find((i) => i.key === tabParam)?.key ?? "overview") as TabKey;
  const [tab, setTabState] = useState<TabKey>(initial);

  useEffect(() => {
    if (tabParam && tabParam !== tab && ALL_ITEMS.some((i) => i.key === tabParam)) {
      setTabState(tabParam as TabKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam]);

  const setTab = (next: TabKey) => {
    setTabState(next);
    nav({ to: "/admin", search: { tab: next }, replace: true });
  };

  useEffect(() => {
    if (loading) return;
    if (!user) nav({ to: "/signin", search: { redirect: "/admin" } });
  }, [loading, user, nav]);

  const current = useMemo(() => ALL_ITEMS.find((i) => i.key === tab) ?? ALL_ITEMS[0], [tab]);

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
    <SidebarProvider>
      <div className="-mx-3 flex min-h-[calc(100vh-3.5rem)] w-[calc(100%+1.5rem)] pb-20 sm:-mx-4 sm:w-[calc(100%+2rem)] md:pb-0">
        <AdminSidebar current={tab} onSelect={setTab} />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="sticky top-14 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-xl sm:px-6">
            <SidebarTrigger className="h-9 w-9" />
            <div className="flex min-w-0 flex-1 items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              <span>Admin</span>
              <span className="opacity-50">/</span>
              <span className="truncate font-medium text-foreground">{current.label}</span>
            </div>
          </div>
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6">
            <div className="mx-auto max-w-6xl space-y-4">
              <header className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{current.label}</h1>
                {current.subtitle && (
                  <p className="text-sm text-muted-foreground">{current.subtitle}</p>
                )}
              </header>
              <div>{tabComponent(tab, setTab)}</div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AdminSidebar({ current, onSelect }: { current: TabKey; onSelect: (k: TabKey) => void }) {
  return (
    <Sidebar collapsible="icon" className="top-14 h-[calc(100vh-3.5rem)]">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Shield className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">Admin console</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Fixido</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {SECTIONS.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = current === item.key;
                  return (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        isActive={active}
                        tooltip={item.label}
                        onClick={() => onSelect(item.key)}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
