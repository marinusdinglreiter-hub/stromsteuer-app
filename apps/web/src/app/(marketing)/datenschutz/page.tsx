import { BRAND } from "@/config/brand";

export const metadata = {
  title: `Datenschutz — ${BRAND.name}`,
};

/**
 * Stub. Wird vor Live-Schaltung durch Anwalt finalisiert.
 * Kernpunkte sind bereits abgebildet (Verarbeitungszwecke, EU-Hosting,
 * Auftragsverarbeiter, Loeschfristen).
 */
export default function DatenschutzPage() {
  return (
    <article className="container max-w-2xl py-12 text-sm leading-relaxed text-foreground">
      <h1 className="mb-6 text-3xl font-bold text-foreground">
        Datenschutzerklärung
      </h1>

      <Section title="1. Verantwortlicher">
        <p>
          Verantwortlich für die Datenverarbeitung ist die{" "}
          <strong>{BRAND.name} GmbH</strong> (siehe Impressum). Bei Rückfragen
          erreichen Sie uns unter {BRAND.email}.
        </p>
      </Section>

      <Section title="2. Verarbeitungszwecke">
        <p>
          Wir verarbeiten Ihre Eingaben aus dem Antragsformular zur Vorbereitung
          und Begleitung Ihres Antrags auf Stromsteuer-Entlastung nach § 9b
          StromStG. Die anwaltliche Bearbeitung übernimmt {BRAND.kanzlei.name}{" "}
          (Auftragsverarbeitungs-Vertrag besteht).
        </p>
      </Section>

      <Section title="3. Hosting & Datenstandort">
        <p>
          Server stehen in der EU (Frankfurt am Main). Hochgeladene
          Stromrechnungen werden verschlüsselt in einem privaten Storage-Bucket
          gespeichert; Datenbank-Backups erfolgen täglich.
        </p>
      </Section>

      <Section title="4. OCR-Dienstleister">
        <p>
          Für die automatische Auslesung Ihrer Stromrechnungen nutzen wir AWS
          Textract (Region eu-central-1, Frankfurt). Die Belege werden nur kurz
          zur Analyse übermittelt und anschließend wieder gelöscht; gespeichert
          bleibt nur das Auslese-Ergebnis und Ihr Original-Beleg in unserem
          eigenen Storage.
        </p>
      </Section>

      <Section title="5. Löschfristen">
        <p>
          Unfertige Anträge (Drafts) werden nach 90 Tagen automatisch gelöscht.
          Eingereichte Anträge und die zugehörigen Belege bewahren wir für die
          Dauer der gesetzlichen Aufbewahrungsfrist auf.
        </p>
      </Section>

      <Section title="6. Ihre Rechte (Art. 15–22 DSGVO)">
        <p>
          Sie haben jederzeit Anspruch auf Auskunft, Berichtigung, Löschung,
          Einschränkung der Verarbeitung und Datenübertragbarkeit. Anfragen
          richten Sie bitte an {BRAND.email}.
        </p>
      </Section>

      <p className="mt-10 text-xs italic text-muted-foreground">
        Hinweis: Diese Datenschutzerklärung ist ein Platzhalter und wird vor
        Live-Schaltung anwaltlich finalisiert.
      </p>
    </article>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-base font-semibold text-foreground">{title}</h2>
      <div className="text-sm">{children}</div>
    </section>
  );
}
