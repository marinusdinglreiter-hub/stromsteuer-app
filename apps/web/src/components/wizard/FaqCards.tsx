import { Clock, HelpCircle, Shield } from "lucide-react";

const FAQS = [
  {
    icon: HelpCircle,
    title: "Warum kenne ich das nicht?",
    body: "Seit 2024 liegt der Erstattungssatz bei 20 EUR/MWh (zuvor 5,13 EUR). Ab 2026 dauerhaft verankert.",
  },
  {
    icon: Clock,
    title: "Ist das wirklich so einfach?",
    body: "Bearbeitungszeit für Sie: ca. 10 Minuten. Alles andere erledigen wir.",
  },
  {
    icon: Shield,
    title: "Wer steht dahinter?",
    body: "Ihr Antrag wird von einer kooperierenden Kanzlei geprüft und beim Hauptzollamt eingereicht.",
  },
];

export function FaqCards() {
  return (
    <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
      {FAQS.map((faq) => (
        <div
          key={faq.title}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <faq.icon className="h-5 w-5 text-slate-400" />
          <div className="mt-2 text-sm font-semibold text-slate-900">
            {faq.title}
          </div>
          <div className="mt-1 text-xs text-slate-500">{faq.body}</div>
        </div>
      ))}
    </div>
  );
}
