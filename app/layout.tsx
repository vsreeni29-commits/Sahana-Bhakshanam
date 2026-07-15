import type { Metadata, Viewport } from "next";
import "@fontsource/fraunces/700.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sahana Bhakshanam | Pure vegetarian Iyer food",
  description:
    "Order pure vegetarian Tamil Brahmin Iyer food, cooked at home in small batches. Pay by cash or direct UPI only at delivery.",
  applicationName: "Sahana Bhakshanam",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sahana Bhakshanam",
  },
  formatDetection: {
    telephone: true,
  },
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#351b31",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
