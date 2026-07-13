import { Lock, Phone, ShieldCheck, Wallet } from "lucide-react";

import { BRAND } from "@/config/brand";

const CARDS = [
  {
    icon: ShieldCheck,
    label: "Partnerkanzlei",
    title: BRAND.kanzlei.name.toUpperCase(),
    description: `RA ${BRAND.kanzlei.anwalt} · ${BRAND.kanzlei.kammer}`,
  },
  {
    icon: Wallet,
    label: "Kein Risiko",
    title: "0 € bei Ablehnung",
    description: "Rein erfolgsbasiertes Honorar",
  },
  {
    icon: Lock,
    label: "Datenschutz",
    title: "DSGVO-konform",
    description: "Server in der EU · SSL-verschlüsselt",
  },
  {
    icon: Phone,
    label: "Direkter Draht",
    title: "Persönlich erreichbar",
    description: "Telefon oder Termin. Jederzeit kostenlos.",
  },
];

export function WarumCards() {
  return (
    <section className="border-y border-slate-100 bg-slate-50 py-14">
      <div className="container">
        <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Warum {BRAND.shortName}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-600">
          Vier Gründe, warum produzierende Unternehmen uns vertrauen. Jeder
          einzelne ist überprüfbar.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CARDS.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <card.icon className="h-5 w-5 text-slate-400" />
              <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {card.label}
              </div>
              <div className="mt-1 text-sm font-bold text-slate-900">
                {card.title}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {card.description}
              </div>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-slate-500">
          Sie sparen 8&ndash;20 Stunden Arbeit, wir maximieren Ihre Erstattung
          und Sie tragen kein Risiko.
        </p>
      </div>
    </section>
  );
}
