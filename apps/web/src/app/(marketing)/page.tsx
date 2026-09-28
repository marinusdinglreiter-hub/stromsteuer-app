import { Ablauf } from "@/components/landing/Ablauf";
import { Faq } from "@/components/landing/Faq";
import { Fristen } from "@/components/landing/Fristen";
import { Hero } from "@/components/landing/Hero";
import { Preistabelle } from "@/components/landing/Preistabelle";
import { ZweiRechnungen } from "@/components/landing/ZweiRechnungen";

/** Fristen und Resttage rechnen mit dem heutigen Datum. */
export const revalidate = 3600;

export default function HomePage() {
  return (
    <>
      <Hero />
      <Ablauf />
      <ZweiRechnungen />
      <Preistabelle />
      <Fristen />
      <Faq />
    </>
  );
}
