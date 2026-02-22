import "./globals.css";
import type { Metadata } from "next";
import { PWARegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: "Barber Scheduler",
  description: "Multi-tenant barber booking platform",
  manifest: "/manifest.webmanifest"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body><PWARegister />{children}</body>
    </html>
  );
}
