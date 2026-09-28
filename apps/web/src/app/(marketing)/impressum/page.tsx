import { BRAND } from "@/config/brand";

export const metadata = {
  title: `Impressum — ${BRAND.name}`,
};

/**
 * Stub. Inhalt wird durch die Partnerkanzlei finalisiert vor Live-Schaltung.
 * Pflichtangaben gemaess § 5 TMG / § 18 MStV.
 */
export default function ImpressumPage() {
  return (
    <article className="container max-w-2xl py-12 text-sm leading-relaxed text-foreground">
      <h1 className="mb-6 text-3xl font-bold text-foreground">Impressum</h1>

      <Section title="Anbieter">
        <p>
          <strong>{BRAND.name} GmbH</strong>
          <br />
          [Strasse Hausnummer]
          <br />
          [PLZ Ort]
        </p>
        <p className="mt-2">
          Telefon: {BRAND.phone}
          <br />
          E-Mail: {BRAND.email}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Handelsregister: [Amtsgericht ..., HRB ...]
          <br />
          USt-IdNr.: [DE...]
          <br />
          Geschäftsführer: [Name]
        </p>
      </Section>

      <Section title="Kooperierender Steuerberater">
        <p>
          Die Antragsbearbeitung und Einreichung beim Hauptzollamt erfolgt über
          die kooperierende Kanzlei{" "}
          <strong>{BRAND.kanzlei.name}</strong>, Steuerberater{" "}
          {BRAND.kanzlei.anwalt} ({BRAND.kanzlei.kammer}).
        </p>
      </Section>

      <Section title="Verantwortlich für den Inhalt">
        <p>[Name, Funktion]</p>
      </Section>

      <p className="mt-10 text-xs italic text-muted-foreground">
        Hinweis: Dieses Impressum ist ein Platzhalter und wird vor öffentlicher
        Schaltung durch die Kanzlei finalisiert.
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
