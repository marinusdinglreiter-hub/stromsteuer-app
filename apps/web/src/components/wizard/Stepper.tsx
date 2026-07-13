import { cn } from "@stromsteuer/ui/lib/utils";
import { Check } from "lucide-react";

export type WizardStep = "berechnen" | "pruefen" | "unterschreiben";

const STEPS: { id: WizardStep; label: string }[] = [
  { id: "berechnen", label: "Berechnen" },
  { id: "pruefen", label: "Prüfen" },
  { id: "unterschreiben", label: "Unterschreiben" },
];

export function Stepper({ current }: { current: WizardStep }) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);

  return (
    <ol className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 py-6">
      {STEPS.map((step, idx) => {
        const done = idx < currentIndex;
        const active = idx === currentIndex;
        return (
          <li key={step.id} className="flex flex-1 items-center">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                  done && "bg-blue-700 text-white",
                  active && "bg-blue-700 text-white",
                  !done && !active && "bg-slate-200 text-slate-500",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : idx + 1}
              </span>
              <span
                className={cn(
                  "text-sm font-medium",
                  (done || active) && "text-slate-900",
                  !done && !active && "text-slate-400",
                )}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 ? (
              <div
                className={cn(
                  "mx-3 h-px flex-1",
                  idx < currentIndex ? "bg-blue-700" : "bg-slate-200",
                )}
                aria-hidden
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
