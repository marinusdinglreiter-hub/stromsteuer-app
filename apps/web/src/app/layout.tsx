import { Inter } from "next/font/google";

import "./globals.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Stromsteuer-Erstattung",
  description:
    "Software-Tool zur Antragsvorbereitung der Stromsteuer-Erstattung nach § 9b StromStG.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
