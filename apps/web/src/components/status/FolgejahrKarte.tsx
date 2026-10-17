"use client";

import { Button } from "@stromsteuer/ui/button";
import { Callout } from "@stromsteuer/ui/callout";
import { useState, useTransition } from "react";

import { folgejahrStartenAction } from "@/app/status/[token]/folgejahr-actions";

type Props = {
  token: string;
  jahr: number;
  /** Ausschlussfrist, vorformatiert */
  frist: string;
};

export function FolgejahrKarte({ token, jahr, frist }: Props) {
  const [pending, startTransition] = useTransition();
  const [fehler, setFehler] = useState<string | null>(null);

  return (
    <section className="rounded-xl border border-primary/30 bg-secondary p-6" aria-labelledby="folgejahr-titel">
      <h2 id="folgejahr-titel" className="text-lg font-semibold tracking-tight">
        Antrag für {jahr} starten
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Das Verbrauchsjahr {jahr} ist abgeschlossen. Firmendaten, Lieferstellen und Ihre Vollmacht im
        Zoll-Portal übernehmen wir. Neu sind nur die Stromrechnungen für {jahr} und die Erklärungen.
        Der Antrag muss bis {frist} beim Hauptzollamt sein.
      </p>
      <Button
        type="button"
        className="mt-4"
        disabled={pending}
        onClick={() => {
          setFehler(null);
          startTransition(async () => {
            const res = await folgejahrStartenAction(token);
            if (!res.ok) setFehler(res.error);
          });
        }}
      >
        {pending ? "Wird angelegt…" : `Antrag für ${jahr} starten`}
      </Button>
      {fehler ? (
        <Callout variant="danger" className="mt-3 text-sm">
          {fehler}
        </Callout>
      ) : null}
    </section>
  );
}
