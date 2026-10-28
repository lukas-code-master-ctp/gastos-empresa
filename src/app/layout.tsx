import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rendiciones de gastos",
  description: "Reembolsos, fondos fijos y caja chica",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
