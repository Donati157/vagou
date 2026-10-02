import type { Metadata } from "next";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireAreaPage } from "@/modules/auth/session";

export const metadata: Metadata = { title: { default: "Painel da empresa", template: "%s · Vagou" }, robots: { index: false, follow: false } };

export default async function CompanyLayout({ children }: { children: React.ReactNode }) {
  await requireAreaPage("company", "/company");
  return (
    <DashboardShell area="Empresa" items={[{ href: "/company", label: "Estacionamentos", icon: "Building2", exact: true }]}>
      {children}
    </DashboardShell>
  );
}
