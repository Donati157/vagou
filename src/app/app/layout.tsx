import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { DriverBottomNav, DriverTopNav } from "@/components/layout/driver-nav";
import { requireAreaPage } from "@/modules/auth/session";

export const metadata: Metadata = { title: { default: "Minha área", template: "%s · Vagou" }, robots: { index: false, follow: false } };

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  await requireAreaPage("driver", "/app");
  return (
    <>
      <SiteHeader />
      <div className="border-b border-asphalt-100 bg-surface">
        <div className="mx-auto hidden max-w-5xl px-4 py-2 sm:px-6 md:block">
          <DriverTopNav />
        </div>
      </div>
      <main id="conteudo" className="mx-auto max-w-5xl px-4 pt-6 pb-28 sm:px-6 md:pb-16">
        {children}
      </main>
      <DriverBottomNav />
    </>
  );
}
