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

const STATE_TEXT: Record<StatusStep["state"], string> = {
  done: "Erledigt",
  active: "In Bearbeitung",
  pending: "Steht aus",
  rejected: "Abgelehnt",
};

export function StatusTimeline({ steps }: { steps: StatusStep[] }) {
  return (
    <ol>
      {steps.map((step, idx) => {
        const Icon = step.icon;
        const last = idx === steps.length - 1;
        const datum = formatDate(step.date);
        return (
          <li
            key={step.key}
            className="relative flex gap-3 pb-5 last:pb-0"
            aria-current={step.state === "active" ? "step" : undefined}
          >
            {!last ? (
              <span
                aria-hidden
                className={cn(
                  "absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px",
                  step.state === "done" ? "bg-success" : "bg-border",
                )}
              />
            ) : null}
            <span
              className={cn(
                "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                step.state === "done" && "bg-success text-success-foreground",
                step.state === "active" && "bg-primary text-primary-foreground ring-4 ring-secondary",
                step.state === "pending" && "border border-input bg-background text-muted-foreground",
                step.state === "rejected" && "bg-destructive text-destructive-foreground",
              )}
            >
              {step.state === "done" ? (
                <Check className="h-4 w-4" aria-hidden />
              ) : (
                <Icon className="h-4 w-4" aria-hidden />
              )}
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div
                className={cn(
                  "text-sm font-medium",
                  step.state === "rejected"
                    ? "text-destructive"
                    : step.state === "pending"
                      ? "text-muted-foreground"
                      : "text-ink",
                )}
              >
                {step.label}
              </div>
              <div className="tnum text-xs text-muted-foreground">
                {STATE_TEXT[step.state]}
                {datum ? <span> · {datum}</span> : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
