"use client";

import { Button } from "@stromsteuer/ui/button";
import {
  Banknote,
  CheckCheck,
  FileCheck,
  Loader2,
  XCircle,
} from "lucide-react";
import { useState, useTransition } from "react";

import { adminUpdateStatusAction } from "@/app/admin/actions";

type Props = {
  applicationId: string;
  currentStatus: string;
};

type NextStatus = "SUBMITTED" | "APPROVED" | "PAID" | "REJECTED";

const ACTIONS: {
  key: NextStatus;
  label: string;
  icon: typeof FileCheck;
  needsAmount?: boolean;
  className: string;
}[] = [
  {
    key: "SUBMITTED",
    label: "Beim HZA eingereicht",
    icon: FileCheck,
    className: "border-indigo-300 text-indigo-700 hover:bg-indigo-50",
  },
  {
    key: "APPROVED",
    label: "Bescheid: bewilligt",
    icon: CheckCheck,
    needsAmount: true,
    className: "border-emerald-300 text-emerald-700 hover:bg-emerald-50",
  },
  {
    key: "PAID",
    label: "Auszahlung erfolgt",
    icon: Banknote,
    needsAmount: true,
    className: "border-emerald-400 bg-emerald-600 text-white hover:bg-emerald-700",
  },
  {
    key: "REJECTED",
    label: "Antrag abgelehnt",
    icon: XCircle,
    className: "border-red-300 text-red-700 hover:bg-red-50",
  },
];

export function StatusActions({ applicationId, currentStatus }: Props) {
  const [pending, startTransition] = useTransition();
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
    setActiveAction(action);
    startTransition(async () => {
      const result = await adminUpdateStatusAction(
        applicationId,
        action,
        hzaAmount,
      );
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 text-sm font-semibold text-slate-900">
        Status-Aktionen
      </div>
      <p className="mb-3 text-xs text-slate-500">
        Aktueller Status: <strong>{currentStatus}</strong>. Jede Aktion
        triggert eine Mail an den Mandanten.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {ACTIONS.map((a) => (
          <div
            key={a.key}
            className="rounded-md border border-slate-100 bg-slate-50 p-2.5"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
              <a.icon className="h-3.5 w-3.5" />
              {a.label}
            </div>
            {a.needsAmount ? (
              <div className="mt-2 flex items-center gap-1">
                <input
                  type="text"
                  inputMode="decimal"
                  value={amounts[a.key]}
                  onChange={(e) =>
                    setAmounts((prev) => ({ ...prev, [a.key]: e.target.value }))
                  }
                  placeholder="HZA-Betrag (€)"
                  className="block w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                />
              </div>
            ) : null}
            <Button
              type="button"
              onClick={() => handleClick(a.key)}
              disabled={pending}
              variant="outline"
              className={`mt-2 w-full ${a.className}`}
            >
              {pending && activeAction === a.key ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : null}
              {a.label}
            </Button>
          </div>
        ))}
      </div>
      {error ? (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}
