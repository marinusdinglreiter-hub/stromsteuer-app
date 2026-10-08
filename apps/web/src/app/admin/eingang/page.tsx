import { Badge } from "@stromsteuer/ui/badge";
import { cn } from "@stromsteuer/ui/lib/utils";
import { ChevronRight, Inbox } from "lucide-react";
import Link from "next/link";

import { erstattungNachSelbstbehalt, formatEur } from "@/lib/format";
import {
  APPLICATION_STATUSES,
  isApplicationStatus,
  STATUS_META,
  statusMeta,
} from "@/lib/status";
import { getAdminServerCaller } from "@/server/trpc-admin";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: { status?: string };
};

function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function EingangPage({ searchParams }: PageProps) {
  const raw = searchParams?.status ?? "PENDING_REVIEW";
  const statusFilter = isApplicationStatus(raw) ? raw : "PENDING_REVIEW";

  const caller = await getAdminServerCaller();
  const [apps, counts] = await Promise.all([
    caller.admin.list({ status: statusFilter }),
    caller.admin.counts(),
  ]);

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Antrags-Eingang</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {apps.length} {apps.length === 1 ? "Vorgang" : "Vorgänge"} mit Status{" "}
            <span className="font-medium text-ink">
              {STATUS_META[statusFilter].label}
            </span>
          </p>
        </div>
        <nav
          aria-label="Nach Status filtern"
          className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
        >
          {APPLICATION_STATUSES.map((s) => {
            const active = s === statusFilter;
            return (
              <Link
                key={s}
                href={`/admin/eingang?status=${s}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-ink bg-ink text-ink-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-input hover:text-ink",
                )}
              >
                {STATUS_META[s].label}
                <span
                  className={cn(
                    "tnum rounded px-1 text-[11px]",
                    active ? "bg-ink-foreground/15" : "bg-muted",
                  )}
                >
                  {counts[s]}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {apps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-input bg-card p-12 text-center">
          <Inbox className="mx-auto h-8 w-8 text-muted-foreground/60" aria-hidden />
          <p className="mt-2 text-sm text-muted-foreground">
            Keine Anträge mit Status „{STATUS_META[statusFilter].label}“.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="tnum w-full min-w-[760px] text-sm">
            <thead className="border-b border-border bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">Mandant</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Jahr</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Erstattung
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">Eingegangen</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Hinweise</th>
                <th scope="col" className="w-10 px-4 py-2.5">
                  <span className="sr-only">Öffnen</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {apps.map((a) => {
                const meta = statusMeta(a.status);
                const erstattung =
                  a.bruttoErstattung !== null
                    ? erstattungNachSelbstbehalt({
                        bruttoErstattung: Number(a.bruttoErstattung),
                        sockel: 250,
                      })
                    : null;
                return (
                  <tr
                    key={a.id}
                    className="relative transition-colors focus-within:bg-secondary/50 hover:bg-secondary/50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/${a.id}`}
                        className="font-medium text-ink after:absolute after:inset-0 focus-visible:ring-0"
                      >
                        {a.mandant?.firmenname ?? "Ohne Firmenname"}
                      </Link>
                      <div className="text-xs text-muted-foreground">{a.mandant?.email ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{a.antragsjahr ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-medium text-ink">
                      {erstattung !== null ? formatEur(erstattung) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(a.submittedAt ?? a.kanzleimandatSignedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={meta.badge}>{meta.label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {a.nutzenergieAnDritteWeitergegeben ? (
                        <Badge variant="warning">Nutzenergie an Dritte</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" aria-hidden />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
