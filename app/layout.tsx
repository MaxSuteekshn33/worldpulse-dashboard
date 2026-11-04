import type { Metadata, Viewport } from "next";
import "./globals.css";
import NavTransition from '@/components/NavTransition'
import ServiceWorker from '@/components/ServiceWorker'

export const metadata: Metadata = {
  title: "WorldPulse — Live News Intelligence",
  description: "Track headlines, politics, world affairs, economy and finance across 200 countries — updated every 20 minutes.",
  applicationName: "WorldPulse",
  /**
   * iOS does not read the web manifest for any of this. Installing from
   * Safari's share sheet uses these tags instead, so without them an added
   * icon falls back to a screenshot of the page and the app opens with
   * Safari's chrome still around it.
   */
  appleWebApp: {
    capable: true,
    title: "WorldPulse",
    // The status bar sits over the page, which is what the dark header and
    // `viewportFit: cover` were already built for.
    statusBarStyle: "black-translucent",
  },
  /**
   * Next emits the standardised `mobile-web-app-capable`. Safari reads the
   * Apple-prefixed name, and on iOS versions before the manifest's `display`
   * was honoured that tag is the only thing that makes an installed site open
   * without browser chrome. Harmless where it is ignored.
   */
  other: { 'apple-mobile-web-app-capable': 'yes' },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
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
      <body style={{ margin: 0 }}>
        <NavTransition>{children}</NavTransition>
        <ServiceWorker />
      </body>
    </html>
  );
}
