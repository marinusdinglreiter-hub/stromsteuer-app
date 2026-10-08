"use client";

import { Button } from "@stromsteuer/ui/button";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Car,
  FileCheck,
  Flame,
  Home,
  PlugZap,
  Scale,
  Users,
} from "lucide-react";
import { useState, useTransition } from "react";

import { erstattungBerechnenAction } from "@/app/antrag/schritt-2/triage-actions";
import { FormAlert } from "@/components/ui/FormAlert";

import {
  TriageCard,
  type TriageAnswer,
  type TriageStatusHint,
} from "./TriageCard";

export type TriageInitial = {
  kleinsteRechtsperson: boolean | null;
  keineFinanzschwierig: boolean | null;
  keineEuRueckforderung: boolean | null;
  privatnutzung: boolean | null;
  privatnutzungKwh: number | null;
  eAutoLaden: boolean | null;
  eAutoKwh: number | null;
  energieAnDritte: boolean | null;
  stromAnDritte: boolean | null;
  entnahmeDurchDritten: boolean | null;
  beihilfeSelbsterklaerung: boolean | null;
};

type State = {
  kleinsteRechtsperson: TriageAnswer;
  keineFinanzschwierig: TriageAnswer;
  keineEuRueckforderung: TriageAnswer;
  privatnutzung: TriageAnswer;
  privatnutzungKwh: number;
  eAutoLaden: TriageAnswer;
  eAutoKwh: number;
  energieAnDritte: TriageAnswer;
  stromAnDritte: TriageAnswer;
  entnahmeDurchDritten: TriageAnswer;
  beihilfeSelbsterklaerung: TriageAnswer;
};

export function TriageForm({ initial }: { initial: TriageInitial }) {
  const [state, setState] = useState<State>({
    kleinsteRechtsperson: initial.kleinsteRechtsperson,
    keineFinanzschwierig: initial.keineFinanzschwierig,
    keineEuRueckforderung: initial.keineEuRueckforderung,
    privatnutzung: initial.privatnutzung,
    privatnutzungKwh: initial.privatnutzungKwh ?? 0,
    eAutoLaden: initial.eAutoLaden,
    eAutoKwh: initial.eAutoKwh ?? 0,
    energieAnDritte: initial.energieAnDritte,
    stromAnDritte: initial.stromAnDritte,
    entnahmeDurchDritten: initial.entnahmeDurchDritten,
    beihilfeSelbsterklaerung: initial.beihilfeSelbsterklaerung,
  });
  const [pending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  function answer<K extends keyof State>(key: K, value: State[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  const allAnswered = (
    [
      "kleinsteRechtsperson",
      "keineFinanzschwierig",
      "keineEuRueckforderung",
      "privatnutzung",
      "eAutoLaden",
      "energieAnDritte",
      "stromAnDritte",
      "entnahmeDurchDritten",
      "beihilfeSelbsterklaerung",
    ] as const
  ).every((k) => state[k] !== null);

  const euBlocked = state.keineEuRueckforderung === false;
  const uisWarn = state.keineFinanzschwierig === false;
  const submitDisabled = !allAnswered || euBlocked || pending;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitDisabled) return;
    setSubmitError(null);
    const formData = new FormData();
    formData.set(
      "kleinsteRechtsperson",
      String(state.kleinsteRechtsperson === true),
    );
    formData.set(
      "keineFinanzschwierig",
      String(state.keineFinanzschwierig === true),
    );
    formData.set(
      "keineEuRueckforderung",
      String(state.keineEuRueckforderung === true),
    );
    formData.set("privatnutzung", String(state.privatnutzung === true));
    formData.set(
      "privatnutzungKwh",
      state.privatnutzung === true ? String(state.privatnutzungKwh) : "",
    );
    formData.set("eAutoLaden", String(state.eAutoLaden === true));
    formData.set(
      "eAutoKwh",
      state.eAutoLaden === true ? String(state.eAutoKwh) : "",
    );
    formData.set("energieAnDritte", String(state.energieAnDritte === true));
    formData.set("stromAnDritte", String(state.stromAnDritte === true));
    formData.set("entnahmeDurchDritten", String(state.entnahmeDurchDritten === true));
    formData.set("beihilfeSelbsterklaerung", String(state.beihilfeSelbsterklaerung === true));

    startTransition(async () => {
      try {
        await erstattungBerechnenAction(formData);
      } catch (err) {
        // redirect() wirft NEXT_REDIRECT — das ist kein Fehler. Sonst zeigen wir die Message.
        if (
          err instanceof Error &&
          !err.message.startsWith("NEXT_REDIRECT")
        ) {
          setSubmitError(err.message);
        }
      }
    });
  }

  const hints = computeHints(state);

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <TriageCard
        icon={Building2}
        title="Unternehmensstruktur"
        description="Der § 9b-Antrag muss von der kleinsten Rechtsperson gestellt werden, die die Produktion selbst betreibt."
        question="Ist dieses Unternehmen die kleinste Rechtsperson mit eigener Produktion?"
        tooltip="Konzerne stellen den Antrag fuer die einzelne Tochter-Gesellschaft, nicht fuer die Holding."
        answer={state.kleinsteRechtsperson}
        onAnswerChange={(v) => answer("kleinsteRechtsperson", v)}
        hint={hints.kleinsteRechtsperson}
      />

      <TriageCard
        icon={AlertTriangle}
        title="Erklärung zur finanziellen Lage"
        description="Das EU-Beihilferecht setzt voraus, dass Empfänger der §9b-Entlastung nicht in finanziellen Schwierigkeiten sind: kein Insolvenzverfahren und kein Verlust von mehr als der Hälfte des gezeichneten Kapitals."
        question="Ist Ihr Unternehmen frei von finanziellen Schwierigkeiten (kein Insolvenzverfahren, Kapital nicht um mehr als die Hälfte gemindert)?"
        tooltip="UiS-Definition gemaess AGVO. Die allermeisten Antragsteller koennen hier sofort abhaken."
        answer={state.keineFinanzschwierig}
        onAnswerChange={(v) => answer("keineFinanzschwierig", v)}
        hint={
          uisWarn
            ? {
                variant: "warning",
                text: "Unternehmen in Schwierigkeiten sind nach AGVO grundsätzlich nicht entlastungsfähig. Bitte mit der Kanzlei klären.",
              }
            : { variant: "info", text: "Die allermeisten Antragsteller können hier sofort abhaken" }
        }
      />

      <TriageCard
        icon={Scale}
        title="EU-Rückforderungsanordnung (Beihilferecht)"
        description="Voraussetzung für die Steuerentlastung (Art. 1 Abs. 4 AGVO). Betrifft KMU in der Praxis kaum."
        question="Ist Ihr Unternehmen frei von einer offenen Rückforderungsanordnung der EU-Kommission wegen rechtswidriger staatlicher Beihilfen?"
        tooltip="Verlangt durch Art. 1 Abs. 4 lit. a) AGVO."
        answer={state.keineEuRueckforderung}
        onAnswerChange={(v) => answer("keineEuRueckforderung", v)}
        hint={
          euBlocked
            ? {
                variant: "danger",
                text: "Ohne diese Bestätigung kann der Antrag nicht gestellt werden.",
              }
            : undefined
        }
      />

      <TriageCard
        icon={Home}
        title="Private Stromnutzung"
        description="Falls am Standort auch privat Strom verbraucht wird, geben Sie bitte die geschätzte Menge an."
        question="Wird ein Teil des Stroms an Ihrem Standort auch privat genutzt?"
        tooltip="Privatanteile sind nicht entlastungsfaehig und werden vom Antragsverbrauch abgezogen."
        answer={state.privatnutzung}
        onAnswerChange={(v) => answer("privatnutzung", v)}
        estimate={{
          label: "Geschätzter privater Verbrauch im Jahr",
          value: state.privatnutzungKwh,
          onChange: (n) => answer("privatnutzungKwh", n),
          hint: "Schaetzung nach § 17b Abs. 4a StromStV",
        }}
      />

      <TriageCard
        icon={Car}
        title="Elektroautos"
        description="Strom für Fahrzeuge, die auch im Straßenverkehr fahren, wird gesondert behandelt und muss angegeben werden."
        question="Laden Sie an Ihrem Standort Elektroautos, die auch im Straßenverkehr fahren?"
        tooltip="Betriebsfahrzeuge wie Gabelstapler oder Hoffahrzeuge zaehlen nicht dazu."
        answer={state.eAutoLaden}
        onAnswerChange={(v) => answer("eAutoLaden", v)}
        estimate={{
          label: "Geschätzte Lade-Menge im Jahr",
          value: state.eAutoKwh,
          onChange: (n) => answer("eAutoKwh", n),
          hint: "ohne Gabelstapler / Hoffahrzeuge",
        }}
        hint={{
          variant: "info",
          text: "Betriebsfahrzeuge wie Gabelstapler oder Hoffahrzeuge zählen nicht dazu.",
        }}
      />

      <TriageCard
        icon={Flame}
        title="Energielieferung an Dritte"
        description="Wenn Sie Wärme, Kälte oder Druckluft an Dritte liefern, ist Formular 1456 erforderlich."
        question="Liefern Sie Wärme, Kälte oder Druckluft an Dritte?"
        tooltip="Formular 1456 (Selbsterklaerung Drittnutzer) wird von der Kanzlei mit eingereicht."
        answer={state.energieAnDritte}
        onAnswerChange={(v) => answer("energieAnDritte", v)}
        hint={
          state.energieAnDritte === true
            ? {
                variant: "info",
                text: "Wir kennzeichnen Ihren Antrag intern als '1456 erforderlich' — die Kanzlei kümmert sich darum.",
              }
            : undefined
        }
      />

      <TriageCard
        icon={PlugZap}
        title="Stromlieferung an Dritte"
        description="Strom, den Sie an andere leisten (z. B. Untermieter, Ladepunkte für Fremde), ist nicht entlastungsfähig und gehört nicht in den Antrag (Formular 1453, Punkt 6)."
        question="Leisten Sie Strom an Dritte?"
        tooltip="Gemeint ist Strom selbst, nicht daraus erzeugte Wärme, Kälte oder Druckluft."
        answer={state.stromAnDritte}
        onAnswerChange={(v) => answer("stromAnDritte", v)}
        hint={
          state.stromAnDritte === true
            ? {
                variant: "info",
                text: "Bitte ziehen Sie diese Mengen von den Verbräuchen Ihrer Lieferstellen ab. Die Kanzlei fragt im Zweifel nach.",
              }
            : undefined
        }
      />

      <TriageCard
        icon={Users}
        title="Entnahme durch einen Dritten"
        description="Die Entlastung erhält nur, wer den Strom selbst entnimmt — die kleinste rechtlich selbständige Einheit (Formular 1453, Punkt 7)."
        question="Entnimmt ein anderes Unternehmen (z. B. eine Betriebsführungsgesellschaft) den Strom an Ihrer Stelle?"
        tooltip="Konzernverbund oder Organschaft spielen dafür keine Rolle."
        answer={state.entnahmeDurchDritten}
        onAnswerChange={(v) => answer("entnahmeDurchDritten", v)}
        hint={
          state.entnahmeDurchDritten === true
            ? {
                variant: "warning",
                text: "Dann muss in der Regel das entnehmende Unternehmen den Antrag stellen. Die Kanzlei prüft das.",
              }
            : undefined
        }
      />

      <TriageCard
        icon={FileCheck}
        title="Selbsterklärung zu staatlichen Beihilfen"
        description="Die Entlastung ist eine staatliche Beihilfe. Für das erste Antragsjahr eines Kalenderjahres ist die Selbsterklärung (Formular 1139) Pflichtanlage."
        question="Geben Sie die Selbsterklärung zu staatlichen Beihilfen (Formular 1139) ab?"
        tooltip="Die Kanzlei schickt Ihnen den Vordruck zur Unterschrift."
        answer={state.beihilfeSelbsterklaerung}
        onAnswerChange={(v) => answer("beihilfeSelbsterklaerung", v)}
        hint={
          state.beihilfeSelbsterklaerung === false
            ? {
                variant: "warning",
                text: "Ohne Selbsterklärung kann der Antrag nicht eingereicht werden.",
              }
            : undefined
        }
      />

      <div className="rounded-md border border-border bg-muted p-3 text-xs text-muted-foreground">
        Ihr Auftrag gilt für das im Bestellvorgang angegebene Kalenderjahr und
        endet mit vollständiger Abwicklung des Erstattungsverfahrens. Für jedes
        weitere Kalenderjahr ist ein neuer Auftrag erforderlich.
      </div>

      {submitError ? <FormAlert>{submitError}</FormAlert> : null}

      <div className="mt-6 flex items-center justify-between">
        <a
          href="/antrag/schritt-2/lieferstellen"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Zurück
        </a>
        <Button
          type="submit"
          size="lg"
          disabled={submitDisabled}
          className="bg-primary text-white hover:bg-primary/90"
        >
          {pending ? "Speichert…" : "Erstattung berechnen"}
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

function computeHints(state: State): {
  kleinsteRechtsperson?: TriageStatusHint;
} {
  const hints: { kleinsteRechtsperson?: TriageStatusHint } = {};
  if (state.kleinsteRechtsperson === false) {
    hints.kleinsteRechtsperson = {
      variant: "warning",
      text: "Bitte den Antrag von der konkreten Produktions-Gesellschaft stellen lassen, nicht von der Holding.",
    };
  }
  return hints;
}
