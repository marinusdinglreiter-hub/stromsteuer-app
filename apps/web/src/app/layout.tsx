import { Inter, Source_Serif_4 } from "next/font/google";

import "./globals.css";

import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";

import { BRAND } from "@/config/brand";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

/** Nur fuer H1/H2 der Marketingseiten (Tailwind `font-serif`). */
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: `${BRAND.name} — Entlastung nach § 9b StromStG`,
  description:
    "Stromsteuer-Entlastung nach § 9b StromStG für Unternehmen des produzierenden Gewerbes: Wir bereiten den Antrag auf, eine Kanzlei reicht ihn im Zoll-Portal ein. Festpreis, vorab bekannt.",
};

const plausibleDomain = process.env.PLAUSIBLE_DOMAIN;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" className={`${inter.variable} ${sourceSerif.variable}`}>
      <head>
        {plausibleDomain ? (
          <Script
            defer
            data-domain={plausibleDomain}
            src="https://plausible.io/js/script.js"
            strategy="afterInteractive"
          />
        ) : null}
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
