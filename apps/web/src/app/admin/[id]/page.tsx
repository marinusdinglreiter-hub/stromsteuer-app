import {
  ArrowLeft,
  Building2,
  Download,
  ExternalLink,
  FileText,
  Mail,
  Phone,
  Scale,
  Zap,
} from "lucide-react";
import { preisFuer } from "@stromsteuer/api/calc/preise";
import { Badge } from "@stromsteuer/ui/badge";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusActions } from "@/components/admin/StatusActions";
import { erstattungNachSelbstbehalt, formatEurRund } from "@/lib/format";
import { statusMeta } from "@/lib/status";
import { getAdminServerCaller } from "@/server/trpc-admin";

export const dynamic = "force-dynamic";

type Props = {
  params: { id: string };
};

function formatEur(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return Number(n).toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });
}

function formatDateTime(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatKwh(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `${n.toLocaleString("de-DE")} kWh`;
}

function jaNein(v: boolean | null | undefined): string {
  if (v === true) return "Ja";
  if (v === false) return "Nein";
  return "—";
}

export default async function AdminDetailPage({ params }: Props) {
  const caller = await getAdminServerCaller();
  const app = await caller.admin.get({ id: params.id }).catch(() => null);
  if (!app) {
    notFound();
  }

  const meta = statusMeta(app.status);
  const bruttoErstattung =
    app.bruttoErstattung !== null ? Number(app.bruttoErstattung) : null;
  const preis = app.nettoKwh !== null ? preisFuer(app.nettoKwh / 1000) : null;

  return (
    <div>
      <Link
        href="/admin/eingang"
        className="inline-flex items-center gap-1 rounded-sm text-sm text-muted-foreground hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Eingang
      </Link>

      <div className="mb-6 mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {app.firmenname ?? "Ohne Firmenname"}
        </h1>
        <Badge variant={meta.badge}>{meta.label}</Badge>
        <span className="text-sm text-muted-foreground">
          {app.antragsjahr ? `Verbrauchsjahr ${app.antragsjahr}` : null}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          {/* Mandant */}
          <Card>
            <CardHeader icon={Building2} title="Mandant" />
            <KV label="Firmenname" value={app.firmenname ?? "—"} />
            <KV label="Rechtsform" value={app.rechtsform ?? "—"} />
            <KV label="Geschäftsführer" value={app.geschaeftsfuehrer ?? "—"} />
            <KV
              label="Vorname / Nachname"
              value={`${app.vorname ?? "—"} ${app.nachname ?? ""}`.trim()}
            />
            <KV label="Adresse"
              value={`${app.strasse ?? "—"}, ${app.plz ?? ""} ${app.ort ?? ""}`.trim()}
            />
            <KV
              label="E-Mail"
              value={
                app.email ? (
                  <a
                    href={`mailto:${app.email}`}
                    className="text-primary hover:underline"
                  >
                    <Mail className="mr-1 inline h-3 w-3" />
                    {app.email}
                  </a>
                ) : (
                  "—"
                )
              }
            />
            <KV
              label="Telefon"
              value={
                app.telefon ? (
                  <a
                    href={`tel:${app.telefon}`}
                    className="text-primary hover:underline"
                  >
                    <Phone className="mr-1 inline h-3 w-3" />
                    {app.telefon}
                  </a>
                ) : (
                  "—"
                )
              }
            />
            <KV label="Vorgang" value={<code className="text-xs">{app.id}</code>} />
            <KV label="Status" value={<Badge variant={meta.badge}>{meta.label}</Badge>} />
          </Card>

          {/* Berechnung */}
          <Card>
            <CardHeader icon={Zap} title="Verbrauch und Berechnung" />
            <KV label="Antragsjahr" value={app.antragsjahr ?? "—"} />
            <KV label="Brutto-kWh (Summe)" value={formatKwh(app.bruttoKwh)} />
            <KV label="Netto-kWh (nach Abzügen)" value={formatKwh(app.nettoKwh)} />
            <KV label="Entlastung" value={formatEur(bruttoErstattung)} />
            <KV
              label="Erstattung nach Selbstbehalt"
              value={
                <span className="font-semibold text-success">
                  {bruttoErstattung !== null
                    ? formatEur(
                        erstattungNachSelbstbehalt({ bruttoErstattung, sockel: 250 }),
                      )
                    : "—"}
                </span>
              }
            />
            <KV
              label={`Aufbereitung (Festpreis, Tabelle ${preis?.version ?? "—"})`}
              value={
                preis === null
                  ? "—"
                  : preis.preisEur !== null
                    ? formatEurRund(preis.preisEur)
                    : preis.band
                      ? "individuell"
                      : "unter 150 MWh"
              }
            />
            <KV
              label="HZA-Bescheid-Betrag"
              value={formatEur(app.hzaAmount ? Number(app.hzaAmount) : null)}
            />
          </Card>

          {/* Lieferstellen */}
          <Card>
            <CardHeader icon={Zap} title={`Lieferstellen (${app.lieferstellen.length})`} />
            {app.lieferstellen.length === 0 ? (
              <div className="text-xs text-muted-foreground">Keine Lieferstellen erfasst.</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-1">Firma</th>
                    <th className="py-1">Adresse</th>
                    <th className="py-1 text-right">kWh</th>
                    <th className="py-1 text-right">Belege</th>
                    <th className="py-1 text-right">OCR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {app.lieferstellen.map((l) => (
                    <tr key={l.id}>
                      <td className="py-1.5 text-foreground">{l.firmenname}</td>
                      <td className="py-1.5 text-muted-foreground">
                        {l.adresse}
                        {l.plz ? ` · ${l.plz}` : ""}
                      </td>
                      <td className="py-1.5 text-right tabular-nums">
                        {l.jahresKwh.toLocaleString("de-DE")}
                      </td>
                      <td className="py-1.5 text-right">{l.belegFileKeys.length}</td>
                      <td className="py-1.5 text-right text-muted-foreground">
                        {l.ocrConfidence !== null
                          ? `${Math.round(l.ocrConfidence * 100)} %`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {/* Triage */}
          <Card>
            <CardHeader icon={Scale} title="Triage-Erklärungen" />
            <KV
              label="Kleinste Rechtsperson mit Produktion"
              value={jaNein(app.triageKleinsteRechtsperson)}
            />
            <KV
              label="Keine finanziellen Schwierigkeiten (UiS)"
              value={jaNein(app.triageKeineFinanzschwierig)}
            />
            <KV
              label="Keine offene EU-Rückforderung"
              value={jaNein(app.triageKeineEuRueckforderung)}
            />
            <KV
              label="Private Stromnutzung"
              value={
                app.triagePrivatnutzung
                  ? `Ja · ${formatKwh(app.triagePrivatnutzungKwh)}`
                  : "Nein"
              }
            />
            <KV
              label="E-Auto-Ladung"
              value={
                app.triageEAutoLaden
                  ? `Ja · ${formatKwh(app.triageEAutoKwh)}`
                  : "Nein"
              }
            />
            <KV
              label="Energielieferung an Dritte"
              value={
                app.triageEnergieAnDritte ? (
                  <span className="font-semibold text-warning-foreground">
                    Ja — Formular 1456 erforderlich
                  </span>
                ) : (
                  "Nein"
                )
              }
            />
          </Card>
        </div>

        <div className="space-y-4">
          {/* Downloads */}
          <Card>
            <CardHeader icon={Download} title="Downloads" />
            <div className="space-y-2 text-sm">
              {app.kanzleiPaketUrl ? (
                <a
                  href={app.kanzleiPaketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 transition-colors hover:border-input hover:bg-muted"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-primary" />
                    Kanzlei-Paket (ZIP)
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </a>
              ) : (
                <div className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                  Noch kein Kanzlei-Paket generiert.
                </div>
              )}
              {app.mandatPdfUrl ? (
                <a
                  href={app.mandatPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 transition-colors hover:border-input hover:bg-muted"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Mandat-PDF (unterschrieben)
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </a>
              ) : (
                <div className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                  Kein Mandat-PDF vorhanden.
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Download-Links sind 1 Stunde gültig.
              </p>
            </div>
          </Card>

          {/* Status-Actions */}
          <StatusActions
            applicationId={app.id}
            currentStatus={app.status}
          />

          {/* Timeline */}
          <Card>
            <CardHeader title="Verlauf" />
            <KV label="Erstellt" value={formatDateTime(app.createdAt)} />
            <KV label="Unterschrieben" value={formatDateTime(app.mandatSignedAt)} />
            <KV
              label="An Kanzlei übergeben"
              value={formatDateTime(app.submittedAt)}
            />
            <KV
              label="HZA-Bescheid"
              value={formatDateTime(app.hzaDecisionAt)}
            />
            <KV label="Auszahlung" value={formatDateTime(app.payoutAt)} />
            <KV
              label="IP des Unterzeichners"
              value={app.mandatSignerIp ?? "—"}
            />
            <KV
              label="User-Agent"
              value={
                <span className="block max-w-full truncate text-xs text-muted-foreground">
                  {app.mandatSignerUserAgent ?? "—"}
                </span>
              }
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      {children}
    </section>
  );
}

function CardHeader({
  icon: Icon,
  title,
}: {
  icon?: typeof Building2;
  title: string;
}) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
      {Icon ? (
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-secondary text-primary">
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
      ) : null}
      {title}
    </h2>
  );
}

function KV({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-baseline gap-3 border-t border-border py-2 text-sm first:border-t-0 first:pt-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="tnum break-words text-right text-foreground">{value}</span>
    </div>
  );
}
