import { Inter } from "next/font/google";

import "./globals.css";

import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";

import { BRAND } from "@/config/brand";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: `${BRAND.name} — § 9b StromStG online beantragen`,
  description:
    "Stromsteuer-Erstattung nach § 9b StromStG für produzierende Unternehmen — online beantragt, anwaltlich begleitet, erfolgsbasierte Vergütung.",
};

const plausibleDomain = process.env.PLAUSIBLE_DOMAIN;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" className={inter.variable}>
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
