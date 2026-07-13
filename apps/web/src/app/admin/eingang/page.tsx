import { Inbox } from "lucide-react";
import Link from "next/link";

import { getAdminServerCaller } from "@/server/trpc-admin";

export const dynamic = "force-dynamic";

type Status =
  | "DRAFT"
  | "SIGNED"
  | "PENDING_REVIEW"
  | "SUBMITTED"
  | "APPROVED"
  | "PAID"
  | "REJECTED"
  | "EXPIRED";

const STATUS_LABELS: Record<Status, string> = {
  DRAFT: "Entwurf",
  SIGNED: "Unterschrieben",
  PENDING_REVIEW: "Kanzlei-Prüfung",
  SUBMITTED: "Beim HZA",
  APPROVED: "Bewilligt",
  PAID: "Ausgezahlt",
  REJECTED: "Abgelehnt",
  EXPIRED: "Abgelaufen",
};

const STATUS_BADGE: Record<Status, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SIGNED: "bg-amber-100 text-amber-800",
  PENDING_REVIEW: "bg-blue-100 text-blue-800",
  SUBMITTED: "bg-indigo-100 text-indigo-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  PAID: "bg-emerald-200 text-emerald-900",
  REJECTED: "bg-red-100 text-red-800",
  EXPIRED: "bg-slate-200 text-slate-500",
};

type PageProps = {
  searchParams?: { status?: string };
};

function formatEur(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return Number(n).toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function EingangPage({ searchParams }: PageProps) {
  const statusFilter = (searchParams?.status ?? "PENDING_REVIEW") as Status;

  const caller = await getAdminServerCaller();
  const apps = await caller.admin.list({ status: statusFilter });

  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Antrags-Eingang
          </h1>
          <p className="text-sm text-slate-500">
            {apps.length} {apps.length === 1 ? "Vorgang" : "Vorgänge"} mit Status{" "}
            <strong className="text-slate-700">
              {STATUS_LABELS[statusFilter]}
            </strong>
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
            <Link
              key={s}
              href={`/admin/eingang?status=${s}`}
              className={
                s === statusFilter
                  ? "rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white"
                  : "rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
              }
            >
              {STATUS_LABELS[s]}
            </Link>
          ))}
        </div>
      </div>

      {apps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Inbox className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">
            Aktuell keine Anträge mit diesem Status.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Mandant</th>
                <th className="px-4 py-3">Jahr</th>
                <th className="px-4 py-3 text-right">Auszahlung</th>
                <th className="px-4 py-3">Eingegangen</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">1456?</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {apps.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">
                      {a.firmenname ?? "—"}
                    </div>
                    <div className="text-xs text-slate-500">{a.email ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {a.antragsjahr ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-900">
                    {formatEur(a.nettoAuszahlung ? Number(a.nettoAuszahlung) : null)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {formatDate(a.submittedAt ?? a.mandatSignedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[a.status as Status]}`}
                    >
                      {STATUS_LABELS[a.status as Status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {a.triageEnergieAnDritte ? (
                      <span className="text-amber-700">⚠ ja</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/${a.id}`}
                      className="rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800"
                    >
                      Öffnen
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
