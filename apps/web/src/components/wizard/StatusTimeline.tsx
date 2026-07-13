import { cn } from "@stromsteuer/ui/lib/utils";
import {
  Banknote,
  Check,
  CircleDashed,
  Clock,
  FileCheck,
  FileSignature,
  type LucideIcon,
} from "lucide-react";

export type StatusStep = {
  key: string;
  label: string;
  icon: LucideIcon;
  /** "done", "active", "pending" oder "rejected" fuer den letzten Schritt. */
  state: "done" | "active" | "pending" | "rejected";
  date?: Date | null;
};

type ApplicationStatusInput = {
  status: string;
  signedAt?: Date | null;
  submittedAt?: Date | null;
  hzaDecisionAt?: Date | null;
  payoutAt?: Date | null;
};

const STEP_DEFS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "signed", label: "Antrag unterschrieben", icon: FileSignature },
  { key: "pending_review", label: "Kanzlei prüft", icon: CircleDashed },
  { key: "submitted", label: "Beim Hauptzollamt eingereicht", icon: FileCheck },
  { key: "decision", label: "Bescheid (4–8 Wochen)", icon: Clock },
  { key: "payout", label: "Erstattung ausgezahlt", icon: Banknote },
];

export function deriveTimeline(app: ApplicationStatusInput): StatusStep[] {
  const status = app.status;

  // Mapping status -> Index des bis hier abgeschlossenen Schritts.
  // SIGNED (0), PENDING_REVIEW (1), SUBMITTED (2), APPROVED/REJECTED (3), PAID (4).
  let doneUntil = -1;
  if (
    status === "SIGNED" ||
    status === "PENDING_REVIEW" ||
    status === "SUBMITTED" ||
    status === "APPROVED" ||
    status === "REJECTED" ||
    status === "PAID"
  ) {
    doneUntil = 0;
  }
  if (status === "PENDING_REVIEW") {
    doneUntil = 1;
  }
  if (
    status === "SUBMITTED" ||
    status === "APPROVED" ||
    status === "REJECTED" ||
    status === "PAID"
  ) {
    doneUntil = 2;
  }
  if (status === "APPROVED" || status === "REJECTED" || status === "PAID") {
    doneUntil = 3;
  }
  if (status === "PAID") {
    doneUntil = 4;
  }

  return STEP_DEFS.map((def, idx) => {
    let state: StatusStep["state"];
    if (status === "REJECTED" && idx === 3) {
      state = "rejected";
    } else if (idx <= doneUntil) {
      state = "done";
    } else if (idx === doneUntil + 1) {
      state = "active";
    } else {
      state = "pending";
    }
    return {
      key: def.key,
      label: def.label,
      icon: def.icon,
      state,
      date:
        idx === 0
          ? app.signedAt
          : idx === 2
            ? app.submittedAt
            : idx === 3
              ? app.hzaDecisionAt
              : idx === 4
                ? app.payoutAt
                : undefined,
    };
  });
}

function formatDate(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function StatusTimeline({ steps }: { steps: StatusStep[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((step) => {
        const Icon = step.icon;
        return (
          <li
            key={step.key}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-3",
              step.state === "done" && "border-emerald-200 bg-emerald-50/40",
              step.state === "active" && "border-blue-200 bg-blue-50/40",
              step.state === "pending" && "border-slate-200 bg-white",
              step.state === "rejected" && "border-red-200 bg-red-50",
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                step.state === "done" && "bg-emerald-600 text-white",
                step.state === "active" && "bg-blue-700 text-white",
                step.state === "pending" && "bg-slate-200 text-slate-500",
                step.state === "rejected" && "bg-red-600 text-white",
              )}
            >
              {step.state === "done" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
            </span>
            <div className="flex-1">
              <div
                className={cn(
                  "text-sm font-semibold",
                  step.state === "rejected" ? "text-red-800" : "text-slate-900",
                )}
              >
                {step.label}
              </div>
              <div className="text-xs text-slate-500">
                {step.state === "done"
                  ? "Erledigt"
                  : step.state === "active"
                    ? "In Bearbeitung"
                    : step.state === "rejected"
                      ? "Abgelehnt"
                      : "Steht aus"}
                {formatDate(step.date) ? (
                  <span> · {formatDate(step.date)}</span>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
