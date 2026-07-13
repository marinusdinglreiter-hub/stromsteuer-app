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
import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusActions } from "@/components/admin/StatusActions";
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

  return (
    <div>
      <Link
        href="/admin/eingang"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zum Eingang
      </Link>

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
                    className="text-blue-700 hover:underline"
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
                    className="text-blue-700 hover:underline"
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
            <KV label="Status" value={app.status} />
          </Card>

          {/* Berechnung */}
          <Card>
            <CardHeader icon={Zap} title="Verbrauch und Berechnung" />
            <KV label="Antragsjahr" value={app.antragsjahr ?? "—"} />
            <KV label="Brutto-kWh (Summe)" value={formatKwh(app.bruttoKwh)} />
            <KV label="Netto-kWh (nach Abzügen)" value={formatKwh(app.nettoKwh)} />
            <KV
              label="Brutto-Erstattung"
              value={formatEur(app.bruttoErstattung ? Number(app.bruttoErstattung) : null)}
            />
            <KV
              label="Erfolgshonorar"
              value={formatEur(app.honorar ? Number(app.honorar) : null)}
            />
            <KV
              label="Voraussichtliche Auszahlung"
              value={
                <strong className="text-blue-700">
                  {formatEur(app.nettoAuszahlung ? Number(app.nettoAuszahlung) : null)}
                </strong>
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
              <div className="text-xs text-slate-500">Keine Lieferstellen erfasst.</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="text-left text-slate-500">
                  <tr>
                    <th className="py-1">Firma</th>
                    <th className="py-1">Adresse</th>
                    <th className="py-1 text-right">kWh</th>
                    <th className="py-1 text-right">Belege</th>
                    <th className="py-1 text-right">OCR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {app.lieferstellen.map((l) => (
                    <tr key={l.id}>
                      <td className="py-1.5 text-slate-900">{l.firmenname}</td>
                      <td className="py-1.5 text-slate-600">
                        {l.adresse}
                        {l.plz ? ` · ${l.plz}` : ""}
                      </td>
                      <td className="py-1.5 text-right tabular-nums">
                        {l.jahresKwh.toLocaleString("de-DE")}
                      </td>
                      <td className="py-1.5 text-right">{l.belegFileKeys.length}</td>
                      <td className="py-1.5 text-right text-slate-500">
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
                  <span className="font-semibold text-amber-700">
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
                  className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 hover:bg-slate-100"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-blue-700" />
                    Kanzlei-Paket (ZIP)
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                </a>
              ) : (
                <div className="rounded-md border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500">
                  Noch kein Kanzlei-Paket generiert.
                </div>
              )}
              {app.mandatPdfUrl ? (
                <a
                  href={app.mandatPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 hover:bg-slate-100"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-slate-500" />
                    Mandat-PDF (unterschrieben)
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                </a>
              ) : (
                <div className="rounded-md border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500">
                  Kein Mandat-PDF vorhanden.
                </div>
              )}
              <p className="text-xs text-slate-400">
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
                <span className="block max-w-full truncate text-xs text-slate-500">
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
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {children}
    </div>
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
    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
      {Icon ? (
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-500">
          <Icon className="h-3.5 w-3.5" />
        </span>
      ) : null}
      {title}
    </div>
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
    <div className="flex items-start justify-between gap-3 border-t border-slate-100 py-2 text-sm first:border-t-0 first:pt-0">
      <span className="shrink-0 text-xs text-slate-500">{label}</span>
      <span className="text-right text-slate-900">{value}</span>
    </div>
  );
}
