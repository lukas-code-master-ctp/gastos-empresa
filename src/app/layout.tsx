import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { MotionConfig } from "@/components/motion";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-bricolage" });
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: { default: "Rindefi", template: "%s · Rindefi" },
  description: "Rinde tus gastos: reembolsos, fondos fijos y caja chica",
};

export const viewport: Viewport = { themeColor: "#2B1028" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${bricolage.variable} ${geist.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        <MotionConfig>{children}</MotionConfig>
      </body>
    </html>
  );
}
