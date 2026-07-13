import { prisma } from "@stromsteuer/db";
import { CheckCircle2, ExternalLink, FileText, Mail } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  StatusTimeline,
  deriveTimeline,
} from "@/components/wizard/StatusTimeline";
import { BRAND } from "@/config/brand";

export const dynamic = "force-dynamic";

type Props = {
  params: { token: string };
};

export default async function StatusPage({ params }: Props) {
  const application = await prisma.application.findUnique({
    where: { sessionToken: params.token },
  });
  if (!application) {
    notFound();
  }

  const steps = deriveTimeline({
    status: application.status,
    signedAt: application.mandatSignedAt,
    submittedAt: application.submittedAt,
    hzaDecisionAt: application.hzaDecisionAt,
    payoutAt: application.payoutAt,
  });

  const auszahlung = application.nettoAuszahlung
    ? Number(application.nettoAuszahlung).toLocaleString("de-DE", {
        style: "currency",
        currency: "EUR",
      })
    : null;

  return (
    <div className="container py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-900">
            ← Zur Startseite
          </Link>
          <span>
            Vorgang: <span className="font-mono">{application.id}</span>
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-700">
              <FileText className="h-6 w-6" />
            </div>
            <h1 className="mt-3 text-2xl font-bold text-slate-900">
              Status Ihres § 9b-Antrags
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {application.firmenname ?? "Antragsteller"} ·{" "}
              {application.antragsjahr ? `Verbrauchsjahr ${application.antragsjahr}` : ""}
            </p>
            {auszahlung ? (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Voraussichtliche Auszahlung: {auszahlung}
              </div>
            ) : null}
          </div>

          <div className="mt-8">
            <StatusTimeline steps={steps} />
          </div>

          {application.email ? (
            <div className="mt-6 inline-flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" />
              Status-Updates schicken wir an{" "}
              <strong className="text-slate-800">{application.email}</strong>.
            </div>
          ) : null}

          {application.status === "REJECTED" ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              Ihr Antrag wurde leider abgelehnt. Gemäß unserer Erfolgshonorar-
              Vereinbarung entstehen Ihnen dadurch keine Kosten. Die Kanzlei
              meldet sich für die Details.
            </div>
          ) : null}
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
          <strong className="text-slate-900">Fragen?</strong> Telefonisch
          erreichen Sie {BRAND.kanzlei.anwalt} unter{" "}
          <a
            href={`tel:${BRAND.phone.replace(/\s/g, "")}`}
            className="text-blue-700 underline-offset-2 hover:underline"
          >
            {BRAND.phone}
          </a>
          {" "}oder per Mail an{" "}
          <a
            href={`mailto:${BRAND.email}`}
            className="text-blue-700 underline-offset-2 hover:underline"
          >
            {BRAND.email}
          </a>
          .
          <Link
            href="/"
            className="ml-2 inline-flex items-center gap-1 text-blue-700 hover:underline"
          >
            Startseite <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
