import type { Metadata, Viewport } from "next";
import { Onest, Oswald, Rubik_Wet_Paint } from "next/font/google";

import "./globals.scss";

import Header from "@/components/layout/header/Header";
import SocialNotices from "@/components/pages/widgets/social-notices/SocialNotices";
import Toast from "@/components/pages/widgets/toast/Toast";
import { SocialProvider } from "@/lib/social";

const onest = Onest({
  subsets: ["latin", "cyrillic"],
  variable: "--font-onest",
});

const oswald = Oswald({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700"],
  variable: "--font-oswald",
});

const wetPaint = Rubik_Wet_Paint({
  subsets: ["latin", "cyrillic"],
  weight: "400",
  variable: "--font-wet-paint",
});

export const metadata: Metadata = {
  title: "Mafia — онлайн игра",
  description: "Обман. Подозрение. Выживание.",
  icons: { icon: "/img/logo.webp" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${onest.variable} ${oswald.variable} ${wetPaint.variable}`}>
      <body suppressHydrationWarning>
        <SocialProvider>
          <div className="app">
            <Header />
            <div className="app-content">{children}</div>
          </div>
          <Toast />
          <SocialNotices />
        </SocialProvider>
      </body>
    </html>
  );
}
