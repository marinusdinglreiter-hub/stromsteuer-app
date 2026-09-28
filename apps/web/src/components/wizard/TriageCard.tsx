"use client";

import { cn } from "@stromsteuer/ui/lib/utils";
import { HelpCircle, type LucideIcon } from "lucide-react";
import { useId } from "react";

import { formatKwh } from "@/lib/format";

export type TriageAnswer = boolean | null;

export type TriageStatusHint = {
  variant: "info" | "warning" | "danger" | "success";
  text: string;
};

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
  question: string;
  tooltip?: string;
  answer: TriageAnswer;
  onAnswerChange: (next: boolean) => void;
  /** Wenn gesetzt, erscheint bei "Ja" ein kWh-Schaetzfeld. */
  estimate?: {
    label: string;
    value: number;
    onChange: (next: number) => void;
    hint?: string;
  };
  hint?: TriageStatusHint;
};

export function TriageCard({
  icon: Icon,
  title,
  description,
  question,
  tooltip,
  answer,
  onAnswerChange,
  estimate,
  hint,
}: Props) {
  const id = useId();
  const headerId = `${id}-title`;

  return (
    <section
      aria-labelledby={headerId}
      className="rounded-xl border border-border bg-white p-5 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <h3 id={headerId} className="text-sm font-semibold text-foreground">
              {title}
            </h3>
            {tooltip ? (
              <span
                title={tooltip}
                className="text-muted-foreground hover:text-muted-foreground"
              >
                <HelpCircle className="h-4 w-4" />
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 rounded-lg bg-muted px-4 py-3">
        <p className="text-sm text-foreground">{question}</p>
        <YesNoToggle answer={answer} onChange={onAnswerChange} />
      </div>

      {answer === true && estimate ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_220px]">
          <label className="text-xs text-muted-foreground">
            {estimate.label}
            {estimate.hint ? (
              <span className="ml-1 text-muted-foreground">— {estimate.hint}</span>
            ) : null}
          </label>
          <div className="relative">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={estimate.value > 0 ? estimate.value : ""}
              onChange={(e) =>
                estimate.onChange(Math.max(0, Number(e.target.value) || 0))
              }
              placeholder="0"
              className="block w-full rounded-md border border-input bg-white px-3 py-2 pr-12 text-right text-sm tabular-nums focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/25"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
              kWh
            </span>
          </div>
          {estimate.value > 0 ? (
            <div className="col-span-full text-xs text-muted-foreground">
              Ihre Angabe: {formatKwh(estimate.value)}
            </div>
          ) : null}
        </div>
      ) : null}

      {hint ? <HintBanner hint={hint} /> : null}
    </section>
  );
}

function YesNoToggle({
  answer,
  onChange,
}: {
  answer: TriageAnswer;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-border bg-white text-xs font-semibold">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={cn(
          "px-4 py-1.5 transition-colors",
          answer === true
            ? "bg-success text-white"
            : "text-muted-foreground hover:bg-muted",
        )}
        aria-pressed={answer === true}
      >
        Ja
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={cn(
          "border-l border-border px-4 py-1.5 transition-colors",
          answer === false
            ? "bg-ink text-white"
            : "text-muted-foreground hover:bg-muted",
        )}
        aria-pressed={answer === false}
      >
        Nein
      </button>
    </div>
  );
}

function HintBanner({ hint }: { hint: TriageStatusHint }) {
  const styles = {
    info: "border-primary/25 bg-secondary text-ink",
    warning: "border-warning/30 bg-warning-soft text-warning-foreground",
    danger: "border-destructive/30 bg-destructive-soft text-destructive",
    success: "border-success/30 bg-success-soft text-success",
  }[hint.variant];

  return (
    <div
      className={cn(
        "mt-3 rounded-md border px-3 py-2 text-xs",
        styles,
      )}
    >
      {hint.text}
    </div>
  );
}
