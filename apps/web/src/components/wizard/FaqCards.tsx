import { Clock, HelpCircle, Landmark } from "lucide-react";

const FAQS = [
  {
    icon: HelpCircle,
    title: "Warum höre ich erst jetzt davon?",
    body: "Seit dem Verbrauchsjahr 2024 beträgt der Satz 20,00 €/MWh, vorher waren es 5,13 €/MWh. Damit lohnt sich der Antrag für deutlich mehr Betriebe.",
  },
  {
    icon: Clock,
    title: "Wie viel Arbeit habe ich damit?",
    body: "Für die Angaben hier rund zehn Minuten. Dazu kommt die Vollmacht im Zoll-Portal, durch die wir Sie mit einer Anleitung führen.",
  },
  {
    icon: Landmark,
    title: "Wer reicht ein?",
    body: "Eine Kanzlei reicht den Antrag als Ihre Bevollmächtigte beim Hauptzollamt ein. Wir bereiten die Daten dafür auf.",
  },
];

export function FaqCards() {
  return (
    <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
      {FAQS.map((faq) => (
        <div key={faq.title} className="rounded-xl border border-border bg-card p-4">
          <faq.icon className="h-5 w-5 text-muted-foreground" aria-hidden />
          <div className="mt-2 text-sm font-medium text-ink">{faq.title}</div>
          <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {faq.body}
          </div>
        </div>
      ))}
    </div>
  );
}
