import { stichtagsPruefung } from "@stromsteuer/antrag";
import { Callout } from "@stromsteuer/ui/callout";

import { BRAND } from "@/config/brand";

function datum(d: { jahr: number; monat: number; tag: number }): string {
  return `${String(d.tag).padStart(2, "0")}.${String(d.monat).padStart(2, "0")}.${d.jahr}`;
}

/**
 * Stichtagsregel (docs/20-vollmachts-onboarding.md): Zertifikat im Haus bis
 * 24.11., sonst bis 10.11. Danach reicht die Zeit bis zur Ausschlussfrist am
 * 31.12. nicht mehr zuverlaessig. Zeigt nichts, solange alles im Zeitplan ist.
 */
export function StichtagHinweis({ antragsjahr }: { antragsjahr: number }) {
  const r = stichtagsPruefung(antragsjahr, new Date());
  if (r.status === "ok") return null;

  if (r.status === "zu-spaet") {
    return (
      <Callout variant="danger" className="mb-4" title="Für dieses Verbrauchsjahr ist es zu spät für einen sicheren Start">
        Der späteste Start war der {datum(r.startMitZertifikat)}. Die Einreichung vor der Ausschlussfrist
        am {datum(r.ausschlussfrist)} ist nicht mehr zuverlässig möglich, und die Frist lässt sich nicht
        verlängern. Das Verbrauchsjahr {antragsjahr} kann damit verfallen. Bitte rufen Sie uns an
        ({BRAND.phone}), wir prüfen, ob es noch gelingt. Für {antragsjahr + 1} können Sie im Januar{" "}
        {antragsjahr + 2} neu starten.
      </Callout>
    );
  }
  return (
    <Callout variant="warning" className="mb-4" title="Die Zeit wird knapp">
      Ohne vorhandenes ELSTER-Zertifikat musste der Start bis {datum(r.startOhneZertifikat)} erfolgen. Mit
      Zertifikat reicht es bis {datum(r.startMitZertifikat)}. Die Ausschlussfrist ist der{" "}
      {datum(r.ausschlussfrist)}.
    </Callout>
  );
}
