import type { Metadata } from "next";
import { Montserrat, Poppins } from "next/font/google";
import "./globals.css";
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

export const metadata: Metadata = {
  title: "Sirena — Esentis",
  description: "Prototipo del asesor de belleza Esentis integrado a Sirena.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "Descubre tu rutina Esentis",
    description: "Una experiencia personalizada en Sirena.",
    images: [{ url: "/og-esentis.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Descubre tu rutina Esentis",
    description: "Una experiencia personalizada en Sirena.",
    images: ["/og-esentis.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-DO">
      <body className={`${poppins.variable} ${montserrat.variable}`}>
        <StoreProvider>
          <SiteHeader />
          {children}
          <SiteFooter />
          <ChatAssistant />
        </StoreProvider>
      </body>
    </html>
  );
}
