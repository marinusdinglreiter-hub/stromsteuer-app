import { AnsprechpartnerBar } from "@/components/landing/AnsprechpartnerBar";
import { Hero } from "@/components/landing/Hero";
import { PartnerStrip } from "@/components/landing/PartnerStrip";
import { WarumCards } from "@/components/landing/WarumCards";

export default function HomePage() {
  return (
    <>
      <Hero />
      <PartnerStrip />
      <AnsprechpartnerBar />
      <WarumCards />
    </>
  );
}
