"use client";

import { Button } from "@stromsteuer/ui/button";
import { ArrowRight, Building2, MapPin, User } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";

import {
  saveFirmaAction,
  type FirmaResult,
} from "@/app/antrag/schritt-3/actions";
import { FormAlert } from "@/components/ui/FormAlert";
import { RECHTSFORMEN } from "@/data/rechtsformen";

export type FirmaInitial = {
  firmenname: string;
  rechtsform: string;
  geschaeftsfuehrer: string;
  vorname: string;
  nachname: string;
  telefon: string;
  strasse: string;
  plz: string;
  ort: string;
};

export function FirmaForm({ initial }: { initial: FirmaInitial }) {
  const [state, action] = useFormState<FirmaResult | null, FormData>(
    saveFirmaAction,
    null,
  );

  return (
    <form action={action} className="grid gap-6">
      <Section icon={Building2} title="Unternehmen">
        <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
          <Field label="Firmenname" required>
            <input
              name="firmenname"
              required
              defaultValue={initial.firmenname}
              placeholder="z. B. Musterfirma GmbH"
              className={INPUT}
            />
          </Field>
          <Field label="Rechtsform" required>
            <select
              name="rechtsform"
              required
              defaultValue={initial.rechtsform || "GmbH"}
              className={INPUT}
            >
              {RECHTSFORMEN.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section icon={User} title="Vertretung">
        <Field label="Geschäftsführer / Inhaber" required>
          <input
            name="geschaeftsfuehrer"
            required
            defaultValue={initial.geschaeftsfuehrer}
            placeholder="Max Mustermann"
            className={INPUT}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Vorname" required>
            <input
              name="vorname"
              required
              defaultValue={initial.vorname}
              placeholder="Max"
              className={INPUT}
            />
          </Field>
          <Field label="Nachname" required>
            <input
              name="nachname"
              required
              defaultValue={initial.nachname}
              placeholder="Mustermann"
              className={INPUT}
            />
          </Field>
        </div>
        <Field label="Telefon (optional)">
          <input
            name="telefon"
            defaultValue={initial.telefon}
            placeholder="+49 …"
            className={INPUT}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Optional — falls wir Rückfragen haben
          </p>
        </Field>
      </Section>

      <Section icon={MapPin} title="Firmenadresse">
        <Field label="Straße und Hausnummer" required>
          <input
            name="strasse"
            required
            defaultValue={initial.strasse}
            placeholder="Industriestraße 27"
            className={INPUT}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
          <Field label="Postleitzahl" required>
            <input
              name="plz"
              required
              pattern="\d{5}"
              maxLength={5}
              title="Bitte genau 5 Ziffern eingeben"
              defaultValue={initial.plz}
              placeholder="54321"
              inputMode="numeric"
              className={INPUT}
            />
          </Field>
          <Field label="Ort" required>
            <input
              name="ort"
              required
              defaultValue={initial.ort}
              placeholder="Beispielstadt"
              className={INPUT}
            />
          </Field>
        </div>
      </Section>

      {state && !state.ok ? <FormAlert>{state.error}</FormAlert> : null}

      <div className="flex items-center justify-between">
        <a
          href="/antrag/schritt-1"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Zurück
        </a>
        <SubmitButton />
      </div>
      <p className="text-right text-xs text-primary">
        Letzter Schritt: Vollmacht unterschreiben.
      </p>
    </form>
  );
}

const INPUT =
  "block w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/25";

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Building2;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
        </span>
        {title}
      </div>
      <div className="grid gap-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      className="bg-primary text-white hover:bg-primary/90"
    >
      {pending ? "Speichert…" : "Unternehmensdaten speichern und weiter"}
      <ArrowRight className="ml-1 h-4 w-4" />
    </Button>
  );
}
