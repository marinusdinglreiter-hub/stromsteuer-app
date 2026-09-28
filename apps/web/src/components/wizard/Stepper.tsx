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
    <nav aria-label="Fortschritt" className="mx-auto w-full max-w-3xl pb-6 pt-2">
      <ol className="flex items-center justify-between gap-2 sm:gap-3">
        {STEPS.map((step, idx) => {
          const done = idx < currentIndex;
          const active = idx === currentIndex;
          return (
            <li key={step.id} className="flex flex-1 items-center last:flex-none">
              <div
                className="flex items-center gap-2"
                aria-current={active ? "step" : undefined}
              >
                <span
                  className={cn(
                    "tnum flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    done && "bg-success text-success-foreground",
                    active && "bg-primary text-primary-foreground ring-4 ring-secondary",
                    !done && !active && "border border-input bg-background text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : idx + 1}
                </span>
                <span
                  className={cn(
                    "text-sm font-medium",
                    active ? "text-ink" : done ? "text-foreground" : "text-muted-foreground",
                    !active && "hidden sm:inline",
                  )}
                >
                  {step.label}
                  {done ? <span className="sr-only"> (erledigt)</span> : null}
                </span>
              </div>
              {idx < STEPS.length - 1 ? (
                <div
                  className={cn(
                    "mx-2 h-px flex-1 sm:mx-3",
                    idx < currentIndex ? "bg-success" : "bg-border",
                  )}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
