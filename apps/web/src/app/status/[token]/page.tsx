import { prisma } from "@stromsteuer/db";
import { Badge } from "@stromsteuer/ui/badge";
import { Callout } from "@stromsteuer/ui/callout";
import { CalendarClock, Mail, Phone } from "lucide-react";
import { notFound } from "next/navigation";

import { Logo } from "@/components/brand/Logo";
import {
  StatusTimeline,
  deriveTimeline,
} from "@/components/wizard/StatusTimeline";
import { BRAND } from "@/config/brand";
import { formatDatum, stichtage } from "@/config/fristen";
import { erstattungNachSelbstbehalt, formatEur } from "@/lib/format";
import { statusMeta } from "@/lib/status";

export const dynamic = "force-dynamic";

type Props = {
  params: { token: string };
};

export default async function StatusPage({ params }: Props) {
  const application = await prisma.antrag.findUnique({
    where: { sessionToken: params.token },
    include: { mandant: { select: { firmenname: true, email: true } } },
  });
  if (!application) {
    notFound();
  }

  const steps = deriveTimeline({
    status: application.status,
    signedAt: application.kanzleimandatSignedAt,
    submittedAt: application.submittedAt,
    hzaDecisionAt: application.hzaDecisionAt,
    payoutAt: application.payoutAt,
  });
  const meta = statusMeta(application.status);
  const frist = application.antragsjahr
    ? stichtage(application.antragsjahr).ausschlussfrist
    : null;
  const erstattung =
    application.bruttoErstattung !== null
      ? erstattungNachSelbstbehalt({
          bruttoErstattung: Number(application.bruttoErstattung),
          sockel: 250,
        })
      : null;

  return (
    <div className="min-h-screen bg-muted">
      <header className="border-b border-border bg-background">
        <div className="container flex h-14 items-center justify-between gap-4">
          <Logo />
          <a
            href={`tel:${BRAND.phone.replace(/\s/g, "")}`}
            className="tnum inline-flex h-9 min-w-9 items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-ink sm:min-w-0"
          >
            <Phone className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only sm:not-sr-only">{BRAND.phone}</span>
          </a>
        </div>
      </header>

      <main className="container py-8 lg:py-12">
        <div className="mx-auto max-w-2xl space-y-4">
          <section className="rounded-xl border border-border bg-card p-6 lg:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  Antrag auf Entlastung nach § 9b StromStG
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                  {application.mandant?.firmenname ?? "Ihr Antrag"}
                </h1>
                {application.antragsjahr ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Verbrauchsjahr {application.antragsjahr}
                  </p>
                ) : null}
              </div>
              <Badge variant={meta.badge}>{meta.label}</Badge>
            </div>

            <dl className="tnum mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-muted px-4 py-3">
                <dt className="text-xs text-muted-foreground">Berechnete Erstattung</dt>
                <dd className="mt-0.5 text-xl font-semibold text-success">
                  {erstattung !== null ? formatEur(erstattung) : "—"}
                </dd>
              </div>
              <div className="rounded-lg bg-muted px-4 py-3">
                <dt className="text-xs text-muted-foreground">Ausschlussfrist beim Hauptzollamt</dt>
                <dd className="mt-0.5 inline-flex items-center gap-1.5 text-xl font-semibold text-ink">
                  <CalendarClock className="h-4 w-4 text-warning" aria-hidden />
                  {frist ? formatDatum(frist) : "—"}
                </dd>
              </div>
            </dl>

            <div className="mt-8">
              <h2 className="mb-3 text-sm font-semibold">Stand</h2>
              <StatusTimeline steps={steps} />
            </div>

            {application.status === "REJECTED" ? (
              // [JURISTISCH ZU PRUEFEN] Wortlaut nach TODO 1.3
              <Callout variant="danger" className="mt-6" title="Das Hauptzollamt hat den Antrag abgelehnt">
                Die Kanzlei prüft, ob ein Einspruch Aussicht hat, und meldet sich
                bei Ihnen. Unsere Aufbereitung wird unabhängig vom Bescheid
                abgerechnet.
              </Callout>
            ) : null}

            {application.mandant?.email ? (
              <p className="mt-6 flex items-start gap-2 text-sm text-muted-foreground">
                <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>
                  Über jeden neuen Schritt informieren wir Sie an{" "}
                  <span className="font-medium text-ink">{application.mandant.email}</span>.
                </span>
              </p>
            ) : null}
          </section>

          <section className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="text-muted-foreground">Fragen zu Ihrem Antrag?</span>
            <span className="flex flex-wrap gap-x-5 gap-y-1">
              <a
                href={`tel:${BRAND.phone.replace(/\s/g, "")}`}
                className="tnum font-medium text-primary underline-offset-4 hover:underline"
              >
                {BRAND.phone}
              </a>
              <a
                href={`mailto:${BRAND.email}`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {BRAND.email}
              </a>
            </span>
          </section>

          <p className="text-center text-xs text-muted-foreground">
            Vorgang <span className="font-mono">{application.id}</span>
          </p>
        </div>
      </main>
    </div>
  );
}
