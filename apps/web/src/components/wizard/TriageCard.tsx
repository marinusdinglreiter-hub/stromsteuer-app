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
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <h3 id={headerId} className="text-sm font-semibold text-slate-900">
              {title}
            </h3>
            {tooltip ? (
              <span
                title={tooltip}
                className="text-slate-400 hover:text-slate-600"
              >
                <HelpCircle className="h-4 w-4" />
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-4 py-3">
        <p className="text-sm text-slate-700">{question}</p>
        <YesNoToggle answer={answer} onChange={onAnswerChange} />
      </div>

      {answer === true && estimate ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_220px]">
          <label className="text-xs text-slate-600">
            {estimate.label}
            {estimate.hint ? (
              <span className="ml-1 text-slate-400">— {estimate.hint}</span>
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
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 pr-12 text-right text-sm tabular-nums focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
              kWh
            </span>
          </div>
          {estimate.value > 0 ? (
            <div className="col-span-full text-xs text-slate-400">
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
    <div className="inline-flex overflow-hidden rounded-md border border-slate-200 bg-white text-xs font-semibold">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={cn(
          "px-4 py-1.5 transition-colors",
          answer === true
            ? "bg-emerald-600 text-white"
            : "text-slate-600 hover:bg-slate-50",
        )}
        aria-pressed={answer === true}
      >
        Ja
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={cn(
          "border-l border-slate-200 px-4 py-1.5 transition-colors",
          answer === false
            ? "bg-slate-900 text-white"
            : "text-slate-600 hover:bg-slate-50",
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
    info: "border-blue-200 bg-blue-50 text-blue-800",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    danger: "border-red-200 bg-red-50 text-red-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
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
