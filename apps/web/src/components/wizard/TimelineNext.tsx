import { Banknote, Building2, Clock, FileSignature, Mail } from "lucide-react";

const STEPS = [
  { icon: FileSignature, label: "Antrag wird erstellt" },
  { icon: Mail, label: "Kanzlei prüft" },
  { icon: Building2, label: "Einreichung beim Hauptzollamt" },
  { icon: Clock, label: "Bescheid (4–8 Wochen)" },
  { icon: Banknote, label: "Erstattung auf Ihr Konto" },
];

export function TimelineNext() {
  return (
    <div className="rounded-xl border border-border bg-muted p-4">
      <div className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Was passiert als Nächstes?
      </div>
      <ol className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {STEPS.map((step, idx) => (
          <li key={step.label} className="flex flex-col items-center text-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-muted-foreground shadow-sm">
              <step.icon className="h-4 w-4" />
            </span>
            <span className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {idx + 1}
            </span>
            <span className="mt-0.5 text-xs leading-tight text-foreground">
              {step.label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
