"use client";

import { Button } from "@stromsteuer/ui/button";
import { Callout } from "@stromsteuer/ui/callout";
import { Input } from "@stromsteuer/ui/input";
import {
  Banknote,
  CheckCheck,
  FileCheck,
  Loader2,
  XCircle,
} from "lucide-react";
import { useState, useTransition } from "react";

import { adminUpdateStatusAction } from "@/app/admin/actions";
import { statusMeta } from "@/lib/status";

type Props = {
  applicationId: string;
  currentStatus: string;
  /** Bereits erfasste Eingangsnummer des Zoll-Portals */
  eingangsnummer?: string | null;
};

type NextStatus = "SUBMITTED" | "APPROVED" | "PAID" | "REJECTED";

const ACTIONS: {
  key: NextStatus;
  label: string;
  icon: typeof FileCheck;
  needsAmount?: boolean;
  /** Eingangsnummer aus dem Zoll-Portal ist Pflicht */
  needsEingang?: boolean;
  destructive?: boolean;
}[] = [
  {
    key: "SUBMITTED",
    label: "Beim HZA eingereicht",
    icon: FileCheck,
    needsEingang: true,
  },
  {
    key: "APPROVED",
    label: "Bescheid: bewilligt",
    icon: CheckCheck,
    needsAmount: true,
  },
  {
    key: "PAID",
    label: "Auszahlung erfolgt",
    icon: Banknote,
    needsAmount: true,
  },
  {
    key: "REJECTED",
    label: "Antrag abgelehnt",
    icon: XCircle,
    destructive: true,
  },
];

/** Der naheliegende naechste Schritt je Status bekommt den Primaer-Button. */
const NAECHSTER: Partial<Record<string, NextStatus>> = {
  SIGNED: "SUBMITTED",
  PENDING_REVIEW: "SUBMITTED",
  SUBMITTED: "APPROVED",
  APPROVED: "PAID",
};

export function StatusActions({ applicationId, currentStatus, eingangsnummer }: Props) {
  const [pending, startTransition] = useTransition();
  const [eingang, setEingang] = useState(eingangsnummer ?? "");
  const [error, setError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<NextStatus | null>(null);
  const [amounts, setAmounts] = useState<Record<NextStatus, string>>({
    SUBMITTED: "",
    APPROVED: "",
    PAID: "",
    REJECTED: "",
  });

  function handleClick(action: NextStatus) {
    setError(null);
    const def = ACTIONS.find((a) => a.key === action)!;
    let hzaAmount: number | undefined;
    if (def.needsAmount) {
      const raw = amounts[action].replace(",", ".");
      const num = Number.parseFloat(raw);
      if (!Number.isFinite(num) || num < 0) {
        setError(
          `Bitte einen gültigen HZA-Betrag eintragen für "${def.label}".`,
        );
        setActiveAction(action);
        return;
      }
      hzaAmount = Math.round(num * 100) / 100;
    }
    if (def.needsEingang && eingang.trim().length < 3) {
      setError("Bitte die Eingangsnummer aus dem Zoll-Portal eintragen.");
      setActiveAction(action);
      return;
    }
    setActiveAction(action);
    startTransition(async () => {
      const result = await adminUpdateStatusAction(
        applicationId,
        action,
        hzaAmount,
        def.needsEingang ? eingang.trim() : undefined,
      );
      if (!result.ok) setError(result.error);
    });
  }

  const naechster = NAECHSTER[currentStatus];

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">Status ändern</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Aktuell: <span className="font-medium text-ink">{statusMeta(currentStatus).label}</span>.
        Jede Änderung schickt dem Mandanten eine E-Mail.
      </p>
      <div className="mt-4 space-y-3">
        {ACTIONS.map((a) => (
          <div key={a.key} className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {a.needsEingang ? (
              <Input
                type="text"
                aria-label="Eingangsnummer aus dem Zoll-Portal"
                value={eingang}
                onChange={(e) => setEingang(e.target.value)}
                placeholder="Eingangsnummer Portal"
                className="tnum h-9 sm:w-40"
              />
            ) : null}
            {a.needsAmount ? (
              <Input
                type="text"
                inputMode="decimal"
                aria-label={`HZA-Betrag für „${a.label}“`}
                value={amounts[a.key]}
                onChange={(e) =>
                  setAmounts((prev) => ({ ...prev, [a.key]: e.target.value }))
                }
                placeholder="HZA-Betrag in €"
                className="tnum h-9 sm:w-40"
              />
            ) : null}
            <Button
              type="button"
              size="sm"
              onClick={() => handleClick(a.key)}
              disabled={pending}
              variant={a.key === naechster ? "default" : "outline"}
              className={
                a.destructive
                  ? "flex-1 justify-start text-destructive hover:bg-destructive-soft hover:text-destructive"
                  : "flex-1 justify-start"
              }
            >
              {pending && activeAction === a.key ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <a.icon className="h-3.5 w-3.5" aria-hidden />
              )}
              {a.label}
            </Button>
          </div>
        ))}
      </div>
      {error ? (
        <Callout variant="danger" className="mt-3 text-xs">
          {error}
        </Callout>
      ) : null}
    </section>
  );
}
