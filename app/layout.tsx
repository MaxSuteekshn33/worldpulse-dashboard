import type { Metadata, Viewport } from "next";
import "./globals.css";
import NavTransition from '@/components/NavTransition'

export const metadata: Metadata = {
  title: "WorldPulse — Live News Intelligence",
  description: "Track headlines, politics, world affairs, economy and finance across 200 countries — updated every 20 minutes.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#08080C",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* The map's own hosts. These were missing while the font hosts were
            here, which is the wrong way round: the fonts are a stylesheet and
            the map is the page. Every map on this site — the dashboard, the
            country pages — cannot start its first request until the browser
            has resolved and shaken hands with these, and that was happening
            only after React had hydrated. */}
        <link rel="preconnect" href="https://maps.googleapis.com" />
        <link rel="preconnect" href="https://maps.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@700;800;900&family=Inter:wght@400;450;500;600;650;700&family=JetBrains+Mono:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0 }}><NavTransition>{children}</NavTransition></body>
    </html>
  );
}
