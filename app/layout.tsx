import type { Metadata } from "next";
import { Montserrat, Poppins } from "next/font/google";
import "./globals.css";
import { loadCatalogProducts } from "./catalog-api";
import { ChatAssistant } from "./chat-assistant";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { StoreProvider } from "./store-provider";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sirena-esentis.faustinodelacruz820.workers.dev";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Sirena — Esentis",
  description: "Prototipo del asesor de belleza Esentis integrado a Sirena.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "Descubre tu rutina Esentis",
    description: "Una experiencia personalizada en Sirena.",
    images: [{ url: `${siteUrl}/og-esentis.png`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Descubre tu rutina Esentis",
    description: "Una experiencia personalizada en Sirena.",
    images: [`${siteUrl}/og-esentis.png`],
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const initialProducts = await loadCatalogProducts().catch(() => []);
  return (
    <html lang="es-DO">
      <body className={`${poppins.variable} ${montserrat.variable}`}>
        <StoreProvider initialProducts={initialProducts}>
          <SiteHeader />
          {children}
          <SiteFooter />
          <ChatAssistant />
        </StoreProvider>
      </body>
    </html>
  );
}
