import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppNavigationProvider } from "@/components/app/navigation-provider";
import { Suspense } from "react";
import { SiteFooterGate } from "@/components/app/site-footer-gate";
import { ThemeScript } from "@/components/app/theme-script";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EntryDesk",
  description: "Official Tournament Entry Management by Crux Studios",
  icons: {
    icon: [
      { url: "/icons/add-athlete-32.svg?v=2", type: "image/svg+xml" },
      { url: "/icon.svg?v=2", type: "image/svg+xml" }
    ],
    shortcut: "/icons/add-athlete-32.svg?v=2",
    apple: "/icons/add-athlete-128.svg?v=2",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Suspense fallback={null}>
          <AppNavigationProvider>
            {children}
            <SiteFooterGate />
          </AppNavigationProvider>
        </Suspense>
        <Toaster richColors position="top-center" />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
