import { CheckCircle2, ExternalLink, Mail } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { triggerSubmitAction } from "@/app/antrag/schritt-3/submit-action";
import { BRAND } from "@/config/brand";
import { SESSION_COOKIE_NAME } from "@/server/session";
import { getServerCaller } from "@/server/trpc";

export const dynamic = "force-dynamic";

export default async function DankePage() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    redirect("/");
  }

  // Idempotent: bei erstem Aufruf laeuft submit, danach nur noch lesen.
  // Fehler protokolliert die Action — die Danke-Seite zeigt sich trotzdem.
  await triggerSubmitAction();

  const caller = await getServerCaller();
  const application = await caller.application.current();

  const statusUrl = `/status/${sessionToken}`;

  return (
    <div className="container py-16">
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          Vielen Dank — Ihr Antrag ist unterwegs.
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Ihre Unterlagen sind bei {BRAND.kanzlei.name} eingegangen. Die Kanzlei
          prüft den Antrag und reicht ihn beim Hauptzollamt ein.
        </p>

        {application.email ? (
          <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <Mail className="h-4 w-4" />
            Bestätigung + unterzeichnete Vollmacht haben wir an{" "}
            <strong className="text-slate-800">{application.email}</strong>{" "}
            geschickt.
          </div>
        ) : null}

        <div className="mt-8 space-y-2">
          <Link
            href={statusUrl}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Status meines Antrags ansehen
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <p className="text-xs text-slate-400">
            Über diesen Link bleibt Ihr Antragsstatus 30 Tage abrufbar.
          </p>
        </div>

        <div className="mt-6 text-xs text-slate-400">
          Vorgang: <span className="font-mono">{application.id}</span>
        </div>
      </div>
    </div>
  );
}
