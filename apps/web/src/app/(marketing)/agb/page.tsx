import { BRAND } from "@/config/brand";

export const metadata = {
  title: `AGB — ${BRAND.name}`,
};

/** Stub. Inhalt wird durch Partnerkanzlei finalisiert vor Live-Schaltung. */
export default function AgbPage() {
  return (
    <article className="container max-w-2xl py-12 text-sm leading-relaxed text-foreground">
      <h1 className="mb-6 text-3xl font-bold text-foreground">
        Allgemeine Geschäftsbedingungen
      </h1>

      <Section title="§ 1 Geltungsbereich">
        <p>
          Diese AGB gelten für die Nutzung der Plattform {BRAND.name} GmbH zur
          Vorbereitung von Anträgen auf Stromsteuer-Erstattung nach § 9b
          StromStG. Mit Klick auf „Unterschreiben und einreichen" erkennen Sie
          diese AGB sowie die anwaltliche Mandatsvereinbarung an.
        </p>
      </Section>

      <Section title="§ 2 Leistungsumfang">
        <p>
          Die Plattform bereitet Ihre Eingaben technisch auf und übergibt sie
          an die kooperierende Kanzlei {BRAND.kanzlei.name}. Die anwaltliche
          Beratung und Antragseinreichung erfolgt ausschließlich durch die
          Kanzlei auf Grundlage des separat geschlossenen Mandatsvertrags.
        </p>
      </Section>

      <Section title="§ 3 Vergütung">
        <p>
          Die Vergütung ist als Erfolgshonorar gemäß § 4a RVG ausgestaltet. Bei
          Ablehnung des Antrags entstehen Ihnen keinerlei Kosten. Mindesthonorar
          im Erfolgsfall: 500 € (siehe Mandatsvereinbarung).
        </p>
      </Section>

      <Section title="§ 4 Haftung">
        <p>
          Die Haftung der {BRAND.name} GmbH ist auf Vorsatz und grobe
          Fahrlässigkeit beschränkt, soweit gesetzlich zulässig. Anwaltliche
          Beratungsfehler richten sich nach der gesetzlichen Berufshaftpflicht
          der Kanzlei.
        </p>
      </Section>

      <Section title="§ 5 Kündigung">
        <p>
          Sie können den Vertrag und das Mandat jederzeit ohne Angabe von
          Gründen kündigen, solange der Antrag noch nicht beim Hauptzollamt
          eingereicht wurde. Eine bereits begonnene Bearbeitung kann nach den
          Regelungen der Mandatsvereinbarung abgerechnet werden.
        </p>
      </Section>

      <Section title="§ 6 Gerichtsstand und anwendbares Recht">
        <p>
          Es gilt deutsches Recht. Gerichtsstand für Kaufleute ist der Sitz der{" "}
          {BRAND.name} GmbH.
        </p>
      </Section>

      <p className="mt-10 text-xs italic text-muted-foreground">
        Hinweis: Diese AGB sind ein Platzhalter und werden vor Live-Schaltung
        durch die Partnerkanzlei finalisiert.
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
