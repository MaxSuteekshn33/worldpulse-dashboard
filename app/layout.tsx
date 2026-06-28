import type { Metadata } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata: Metadata = {
  title: "WorldPulse — Live News Intelligence",
  description: "Interactive world news dashboard",
};

export function generateStaticParams() { return [] }

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ height: '100%' }}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@700;900&family=JetBrains+Mono:wght@400;500;700&family=Saira:wght@400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ height: '100%', margin: 0, background: '#000' }}>{children}</body>
    </html>
  );
}
