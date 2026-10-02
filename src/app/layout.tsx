import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { SITE } from "@/lib/site";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"], weight: ["500", "600", "700", "800"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} — ${SITE.headline}`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.headline}`,
    description: SITE.description,
  },
  twitter: { card: "summary_large_image", title: SITE.name, description: SITE.description },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#17382A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${outfit.variable}`}>
      <body className="min-h-dvh">
        <a href="#conteudo" className="sr-only z-[2000] rounded-md bg-ink-900 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
          Pular para o conteúdo
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
