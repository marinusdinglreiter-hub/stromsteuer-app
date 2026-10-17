import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ClipboardList,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  KeyRound,
  Landmark,
  Mail,
  Phone,
  Scale,
  Zap,
} from "lucide-react";
import { Badge } from "@stromsteuer/ui/badge";
import Link from "next/link";
import { notFound } from "next/navigation";

import { KontaktHistorie } from "@/components/admin/KontaktHistorie";
import { PortalZugangKarte } from "@/components/admin/PortalZugangKarte";
import { StatusActions } from "@/components/admin/StatusActions";
import { formatEurRund } from "@/lib/format";
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

function formatDate(d: Date): string {
  // Zeitraeume liegen als UTC-Mitternacht vor (Parser), daher UTC formatieren.
  return d.toLocaleDateString("de-DE", { timeZone: "UTC" });
}

function BelegLink({ url, name }: { url: string | null; name: string }) {
  if (!url) {
    return <span className="text-muted-foreground">{name}</span>;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-primary hover:underline"
    >
      <FileText className="h-3 w-3" />
      {name}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
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
  const kontakte = await caller.admin.kontakte({ id: params.id });

  const meta = statusMeta(app.status);
  const m = app.mandant;
  const preisEur = app.preisEur !== null ? Number(app.preisEur) : null;
  const vollmacht = m?.portalZugang?.vollmachtStatus ?? "OFFEN";

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
          {m?.firmenname ?? "Ohne Firmenname"}
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
            <KV label="Firmenname" value={m?.firmenname ?? "—"} />
            <KV label="Rechtsform" value={m?.rechtsform ?? "—"} />
            <KV label="Geschäftsführer" value={m?.geschaeftsfuehrer ?? "—"} />
            <KV
              label="Vorname / Nachname"
              value={`${m?.vorname ?? "—"} ${m?.nachname ?? ""}`.trim()}
            />
            <KV label="Adresse"
              value={`${m?.strasse ?? "—"}, ${m?.plz ?? ""} ${m?.ort ?? ""}`.trim()}
            />
            <KV
              label="E-Mail"
              value={
                m?.email ? (
                  <a
                    href={`mailto:${m.email}`}
                    className="text-primary hover:underline"
                  >
                    <Mail className="mr-1 inline h-3 w-3" />
                    {m.email}
                  </a>
                ) : (
                  "—"
                )
              }
            />
            <KV
              label="Telefon"
              value={
                m?.telefon ? (
                  <a
                    href={`tel:${m.telefon}`}
                    className="text-primary hover:underline"
                  >
                    <Phone className="mr-1 inline h-3 w-3" />
                    {m.telefon}
                  </a>
                ) : (
                  "—"
                )
              }
            />
            <KV label="Vorgang" value={<code className="text-xs">{app.id}</code>} />
            <KV label="Status" value={<Badge variant={meta.badge}>{meta.label}</Badge>} />
          </Card>

          {/* Steuer und Bank */}
          <Card>
            <CardHeader icon={Landmark} title="Steuer- und Bankdaten (Formular 1453)" />
            <KV
              label="Unternehmensart"
              value={
                m?.unternehmensart === "PRODUZIERENDES_GEWERBE"
                  ? "Produzierendes Gewerbe"
                  : m?.unternehmensart === "LAND_FORSTWIRTSCHAFT"
                    ? "Land- und Forstwirtschaft"
                    : "—"
              }
            />
            <KV label="Steuernummer" value={m?.steuernummer ?? "—"} />
            <KV label="Hauptzollamt" value={m?.hauptzollamt ?? "—"} />
            <KV label="Kontoinhaber" value={m?.kontoinhaber ?? "—"} />
            <KV label="IBAN" value={m?.iban ? <code className="text-xs">{m.iban}</code> : "—"} />
          </Card>

          {/* Berechnung */}
          <Card>
            <CardHeader icon={Zap} title="Verbrauch und Berechnung" />
            <KV label="Antragsjahr" value={app.antragsjahr ?? "—"} />
            <KV label="Brutto-kWh (Summe)" value={formatKwh(app.bruttoKwh)} />
            <KV label="Netto-kWh (nach Abzügen)" value={formatKwh(app.nettoKwh)} />
            <KV
              label={`Entlastung (${app.berechnung.satzEurProMwh.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €/MWh)`}
              value={formatEur(app.berechnung.bruttoErstattung)}
            />
            <KV
              label="Erstattung nach Selbstbehalt"
              value={
                <span className="font-semibold text-success">
                  {formatEur(app.berechnung.auszahlung)}
                </span>
              }
            />
            <KV
              label={`Aufbereitung (Festpreis, Tabelle ${app.preisTabelleVersion ?? "—"})`}
              value={
                preisEur !== null
                  ? formatEurRund(preisEur)
                  : app.aufbereitungSignedAt
                    ? "individuelles Angebot"
                    : "noch nicht vereinbart"
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
              <div className="divide-y divide-border">
                {app.lieferstellen.map((l, i) => (
                  <div key={l.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="text-sm font-semibold text-foreground">
                        {i + 1}. {l.firmenname || "ohne Bezeichnung"}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {l.adresse}
                          {l.plz ? ` · ${l.plz}` : ""}
                          {l.versorger ? ` · ${l.versorger}` : ""}
                        </span>
                      </div>
                      <div className="text-xs tabular-nums text-foreground">
                        Sp. 3/4/5:{" "}
                        {[l.kwhEigenbetrieblich, l.kwhNutzenergiePG, l.kwhNutzenergieLuF]
                          .map((k) => k.toLocaleString("de-DE"))
                          .join(" / ")}{" "}
                        kWh
                      </div>
                    </div>

                    {l.hinweise.length > 0 ? (
                      <ul className="mt-2 space-y-1">
                        {l.hinweise.map((h) => (
                          <li
                            key={h.text}
                            className={
                              h.stufe === "warnung"
                                ? "flex items-start gap-1.5 rounded border border-warning/30 bg-warning-soft px-2 py-1 text-xs text-warning-foreground"
                                : "flex items-start gap-1.5 px-2 text-xs text-muted-foreground"
                            }
                          >
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                            {h.text}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="mt-2 inline-flex items-center gap-1 text-xs text-success">
                        <CheckCircle2 className="h-3 w-3" />
                        Rechnungen decken das Antragsjahr ab, Werte plausibel.
                      </div>
                    )}

                    {l.belege.length > 0 || l.ohneWerte.length > 0 ? (
                      <table className="mt-2 w-full text-xs">
                        <thead className="text-left text-muted-foreground">
                          <tr>
                            <th className="py-1">Rechnung</th>
                            <th className="py-1">Zeitraum</th>
                            <th className="py-1 text-right">kWh</th>
                            <th className="py-1 text-right">Stromsteuer</th>
                            <th className="py-1">Zählpunkt / MaLo</th>
                            <th className="py-1 text-right">Erkennung</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {l.belege.map((b) => (
                            <tr key={b.id}>
                              <td className="py-1.5">
                                <BelegLink url={b.url} name={b.dateiname} />
                              </td>
                              <td className="py-1.5 tabular-nums text-muted-foreground">
                                {b.zeitraumVon && b.zeitraumBis
                                  ? `${formatDate(b.zeitraumVon)} – ${formatDate(b.zeitraumBis)}`
                                  : "nicht erkannt"}
                              </td>
                              <td className="py-1.5 text-right tabular-nums">
                                {b.kwh !== null ? b.kwh.toLocaleString("de-DE") : "—"}
                              </td>
                              <td className="py-1.5 text-right tabular-nums">
                                {formatEur(b.stromsteuerEur)}
                              </td>
                              <td className="py-1.5 font-mono text-[11px] text-muted-foreground">
                                {b.zaehlpunkt ?? "—"}
                              </td>
                              <td className="py-1.5 text-right text-muted-foreground">
                                {b.extraktion === "keine"
                                  ? "nicht lesbar"
                                  : b.ocrConfidence !== null
                                    ? `${Math.round(b.ocrConfidence * 100)} %`
                                    : "—"}
                              </td>
                            </tr>
                          ))}
                          {l.ohneWerte.map((b) => (
                            <tr key={b.key}>
                              <td className="py-1.5">
                                <BelegLink url={b.url} name={b.key.split("/").pop() ?? b.key} />
                              </td>
                              <td colSpan={5} className="py-1.5 text-muted-foreground">
                                ohne ausgelesene Werte
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : null}
                  </div>
                ))}
              </div>
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
              label="Nutzenergie an Dritte"
              value={
                app.nutzenergieAnDritteWeitergegeben ? (
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
          {/* Vollstaendigkeit */}
          <Card>
            <CardHeader
              icon={app.fehlend.length === 0 ? CheckCircle2 : AlertTriangle}
              title={
                app.fehlend.length === 0
                  ? "Vollständig — bereit zur Einreichung"
                  : `Fehlt noch (${app.fehlend.length})`
              }
            />
            {app.fehlend.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Alle Angaben für das Zoll-Portal liegen vor.
              </p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {app.fehlend.map((f) => (
                  <li key={f.feld} className="flex items-start justify-between gap-3">
                    <span>{f.label}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {f.quelle}
                      {f.formularAbschnitt ? ` · Abschn. ${f.formularAbschnitt}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Portal-Vollmacht */}
          <Card>
            <CardHeader icon={KeyRound} title="Vollmacht im Zoll-Portal" />
            <PortalZugangKarte
              antragId={app.id}
              mandantVorhanden={Boolean(m)}
              vollmachtStatus={vollmacht}
              elsterStatus={m?.portalZugang?.elsterStatus ?? "UNBEKANNT"}
              beteiligtenNummer={m?.portalZugang?.beteiligtenNummer ?? null}
              codeVorhanden={Boolean(m?.portalZugang?.zugangscodeEnc)}
              codeEingegangenAt={m?.portalZugang?.zugangscodeEingegangenAt?.toISOString() ?? null}
              eskalationsstufe={m?.portalZugang?.eskalationsstufe ?? 0}
              rueckrufAngefordertAt={m?.portalZugang?.rueckrufAngefordertAt?.toISOString() ?? null}
              schritteErledigt={m?.portalZugang?.schritteErledigt ?? []}
            />
          </Card>

          {/* Kontakthistorie */}
          <Card>
            <CardHeader icon={Mail} title={`Kontakte (${kontakte.length})`} />
            <KontaktHistorie
              antragId={app.id}
              mandantVorhanden={Boolean(m)}
              eintraege={kontakte.map((k) => ({
                id: k.id,
                kanal: k.kanal,
                richtung: k.richtung,
                betreff: k.betreff,
                text: k.text,
                automatisch: k.automatisch,
                erstelltVon: k.erstelltVon,
                createdAt: k.createdAt.toISOString(),
              }))}
            />
          </Card>

          {/* Downloads */}
          <Card>
            <CardHeader icon={Download} title="Downloads" />
            <div className="space-y-2 text-sm">
              <a
                href={`/admin/${app.id}/portal`}
                className="flex items-center justify-between rounded-md border border-primary bg-primary/10 px-3 py-2 font-medium transition-colors hover:bg-primary/15"
              >
                <span className="inline-flex items-center gap-1.5">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  Portal-Eingabeblatt (Felder zum Übertragen)
                </span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
              <a
                href={`/admin/${app.id}/datenblatt`}
                className="flex items-center justify-between rounded-md border border-primary/40 bg-primary/5 px-3 py-2 font-medium transition-colors hover:bg-primary/10"
              >
                <span className="inline-flex items-center gap-1.5">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  Datenblatt § 9b (Excel, aktueller Stand)
                </span>
                <Download className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
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
              {(
                [
                  [app.aufbereitungPdfUrl, "Aufbereitungsvertrag (unterschrieben)"],
                  [app.kanzleimandatPdfUrl, "Kanzleimandat und Vollmacht (unterschrieben)"],
                ] as const
              ).map(([url, label]) =>
                url ? (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 transition-colors hover:border-input hover:bg-muted"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {label}
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                ) : (
                  <div
                    key={label}
                    className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground"
                  >
                    {label}: noch nicht vorhanden.
                  </div>
                ),
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
            eingangsnummer={app.eingangsnummer}
          />

          {/* Timeline */}
          <Card>
            <CardHeader title="Verlauf" />
            <KV label="Erstellt" value={formatDateTime(app.createdAt)} />
            <KV label="Aufbereitungsvertrag" value={formatDateTime(app.aufbereitungSignedAt)} />
            <KV label="Kanzleimandat" value={formatDateTime(app.kanzleimandatSignedAt)} />
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
