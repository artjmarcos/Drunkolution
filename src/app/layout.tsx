import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Drunkolution 🐒🍺 — The Drunken Ape Theory",
  description:
    "La teoría de Robert Dudley jugable: un simio escala 13 eras bebiendo (Mioceno → Era Espacial), combate 5 jefes anti-sobriedad y evoluciona con ADN. Sobrio, Alegre, Ciego… o Blackout.",
  keywords: ["drunkolution", "juego", "mono", "borracho", "evolución", "plataformas", "arcade", "doodle jump"],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Drunkolution: The Drunken Ape Theory",
    description: "Cada gran logro de la humanidad fue un accidente de mono borracho.",
    siteName: "Drunkolution",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0f0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
