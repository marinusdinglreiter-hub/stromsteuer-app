import { Callout } from "@stromsteuer/ui/callout";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PortalEingabeBlatt } from "@/components/admin/PortalEingabeBlatt";
import { getAdminServerCaller } from "@/server/trpc-admin";

export const dynamic = "force-dynamic";

type Props = {
  params: { id: string };
};

/**
 * Portal-Eingabeblatt: Die Kanzlei uebertraegt die Felder in der Reihenfolge
 * von Formular 1453 ins Zoll-Portal, kopiert je Feld den Wert, hakt ab und
 * sieht daneben den Beleg. Der Antrag wird dort strukturiert eingegeben; ein
 * ausgefuelltes Formular 1453 gibt es nicht.
 */
export default async function PortalBlattPage({ params }: Props) {
  const caller = await getAdminServerCaller();
  const blatt = await caller.admin.portalBlatt({ id: params.id }).catch(() => null);
  if (!blatt) notFound();

  return (
    <div>
      <Link
        href={`/admin/${blatt.antragId}`}
        className="inline-flex items-center gap-1 rounded-sm text-sm text-muted-foreground hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Zurück zum Antrag
      </Link>

      <h1 className="mt-3 text-xl font-semibold tracking-tight">
        Portal-Eingabeblatt{blatt.firmenname ? ` — ${blatt.firmenname}` : ""}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Verbrauchsjahr {blatt.antragsjahr ?? "—"}. Felder in der Reihenfolge von Formular 1453,
        je Feld kopieren, im Zoll-Portal einfügen und abhaken.
      </p>

      {blatt.vollmachtStatus !== "AKTIV" ? (
        <Callout variant="warning" className="mt-4 text-sm" title="Vollmacht im Portal noch nicht aktiv">
          Eintragen können Sie erst, wenn die Vollmacht aktiv und auf „Sonstige steuerliche
          Anträge“ geprüft ist (Status: {blatt.vollmachtStatus}).
        </Callout>
      ) : null}

      <PortalEingabeBlatt
        antragId={blatt.antragId}
        felder={blatt.felder.map((f) => ({
          key: f.key,
          abschnitt: f.abschnitt,
          label: f.label,
          wert: f.wert,
          herkunft: f.herkunft,
          konfidenz: f.konfidenz ?? null,
          erledigt: f.erledigtAt !== null,
        }))}
        belege={blatt.belege}
        fehlend={blatt.fehlend.map((f) => f.label)}
        eingangsnummer={blatt.eingangsnummer}
      />
    </div>
  );
}
