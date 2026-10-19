import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import RegisterSW from "@/components/pwa/RegisterSW";

export const metadata: Metadata = {
  title: "Drunkolution",
  description: "Juego arcade acerca de la evolución",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta name="theme-color" content="#07090f" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/icons/icon-192.svg" />
      </head>
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
