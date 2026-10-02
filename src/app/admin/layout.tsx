import type { Metadata } from "next";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireAreaPage } from "@/modules/auth/session";

export const metadata: Metadata = { title: { default: "Admin Vagou", template: "%s · Admin Vagou" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAreaPage("admin", "/admin");
  return (
    <DashboardShell area="Admin Vagou" items={[
        { href: "/admin", label: "Visão geral", icon: "LayoutDashboard", exact: true },
        { href: "/admin/usuarios", label: "Usuários", icon: "Users" },
        { href: "/admin/empresas", label: "Empresas", icon: "Building2" },
        { href: "/admin/estacionamentos", label: "Shoppings", icon: "ParkingSquare" },
        { href: "/admin/fontes", label: "Fontes de dados", icon: "MonitorDot" },
        { href: "/admin/atividade", label: "Atividade", icon: "BarChart3" },
      ]}>
      {children}
    </DashboardShell>
  );
}
