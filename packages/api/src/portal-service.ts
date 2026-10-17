/**
 * Portal-Onboarding (TODO 2.1): gemeinsame Bausteine fuer Kunden-Router,
 * Backoffice und Cron. Der Zustand haengt am Mandanten (PortalZugang), die
 * Zaehlung der Erinnerungstage an der Unterschrift des Kanzleimandats.
 */

import { faelligeErinnerung, type ErinnerungsStufe } from "@stromsteuer/antrag";
import { prisma } from "@stromsteuer/db";

import { berechneAntrag, ladeAntrag } from "./antrag-service";
import { tryLogAudit } from "./audit";
import { sendMail } from "./email/client";
import { renderPortalErinnerung, type PortalMailInput } from "./email/portal-templates";
import { env } from "./env";
import { logMailAnKunde } from "./kontakt-service";

export type BrandInfo = { name: string; shortName: string; kanzleiName: string };

export function datumDe(jahr: number, monat: number, tag: number): string {
  return `${String(tag).padStart(2, "0")}.${String(monat).padStart(2, "0")}.${jahr}`;
}

/** Mail-Eingabe fuer einen Antrag; Betraege und Fristen aus dem aktuellen Stand. */
export async function portalMailInput(antragId: string, brand: BrandInfo): Promise<{
  input: PortalMailInput;
  email: string | null;
}> {
  const antrag = await ladeAntrag(antragId);
  const jahr = antrag.antragsjahr ?? new Date().getFullYear() - 1;
  const m = antrag.mandant;
  const name = [m?.vorname, m?.nachname].filter(Boolean).join(" ") || m?.geschaeftsfuehrer || null;
  let erstattung: number | null = null;
  try {
    erstattung = berechneAntrag(antrag).auszahlung;
  } catch {
    erstattung = null;
  }
  const e = env();
  return {
    email: m?.email ?? null,
    input: {
      brand: { name: brand.name, shortName: brand.shortName },
      ansprechpartner: name,
      kanzleiName: brand.kanzleiName,
      antragsjahr: jahr,
      erstattung,
      statusUrl: `${e.APP_BASE_URL}/status/${antrag.sessionToken}`,
      terminUrl: e.TERMIN_URL ?? null,
      fristDatum: datumDe(jahr + 1, 12, 31),
      vollmachtBisDatum: datumDe(jahr + 1, 12, 1),
    },
  };
}

export type ErinnerungsStatistik = {
  geprueft: number;
  gesendet: number;
  /** Stufe 3 heisst laut Konzept: Anruf, Frist benannt */
  anrufFaellig: number;
  ohneEmail: number;
  fehlgeschlagen: number;
  proStufe: Record<ErinnerungsStufe, number>;
};

/**
 * Verschickt faellige Erinnerungen (Tag 2, 5, 10, 14 ab Unterschrift) und
 * merkt die Stufe am PortalZugang. Je Antrag hoechstens eine Mail pro Lauf.
 * Eine Stufe gilt erst als erledigt, wenn die Mail wirklich raus ist: ohne
 * Mail-Konfiguration oder bei Fehlern wird sie beim naechsten Lauf erneut
 * versucht.
 */
export async function sendeErinnerungen(
  brand: BrandInfo,
  jetzt: Date = new Date(),
  /** Nur diese Antraege pruefen (gezielte Laeufe, Integrationstests); Standard: alle */
  nurAntraege?: string[],
): Promise<ErinnerungsStatistik> {
  const stats: ErinnerungsStatistik = {
    geprueft: 0,
    gesendet: 0,
    anrufFaellig: 0,
    ohneEmail: 0,
    fehlgeschlagen: 0,
    proStufe: { 1: 0, 2: 0, 3: 0, 4: 0 },
  };

  const kandidaten = await prisma.antrag.findMany({
    where: {
      ...(nurAntraege ? { id: { in: nurAntraege } } : {}),
      status: { in: ["SIGNED", "PENDING_REVIEW"] },
      kanzleimandatSignedAt: { not: null },
      mandantId: { not: null },
    },
    select: { id: true, kanzleimandatSignedAt: true, mandantId: true, mandant: { select: { portalZugang: true } } },
  });

  for (const k of kandidaten) {
    stats.geprueft++;
    const zugang = k.mandant?.portalZugang ?? null;
    const stufe = faelligeErinnerung(k.kanzleimandatSignedAt!, jetzt, zugang);
    if (!stufe) continue;

    const { input, email } = await portalMailInput(k.id, brand);
    if (!email) {
      stats.ohneEmail++;
      continue;
    }
    const mail = renderPortalErinnerung(stufe, input);
    const res = await sendMail({
      to: email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      replyTo: env().KANZLEI_EMAIL_INBOX,
    });
    if (!res.ok) {
      stats.fehlgeschlagen++;
      continue;
    }

    await prisma.portalZugang.upsert({
      where: { mandantId: k.mandantId! },
      create: { mandantId: k.mandantId!, eskalationsstufe: stufe, letzteErinnerungAt: jetzt },
      update: { eskalationsstufe: stufe, letzteErinnerungAt: jetzt },
    });
    await logMailAnKunde(k.mandantId, k.id, mail.subject);
    await tryLogAudit({
      antragId: k.id,
      type: "PORTAL_ERINNERUNG",
      actor: "SYSTEM",
      metadata: { stufe },
    });
    stats.gesendet++;
    stats.proStufe[stufe]++;
    if (stufe === 3) stats.anrufFaellig++;
  }
  return stats;
}
