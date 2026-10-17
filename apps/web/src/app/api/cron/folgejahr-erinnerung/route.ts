import type { NextRequest } from "next/server";

import { BRAND } from "@/config/brand";
import { fuehreCronAus } from "@/server/cron";

export const runtime = "nodejs";

/**
 * Vercel-Cron-Endpoint — laeuft taeglich und erinnert Bestandskunden im Januar an
 * den Antrag fuers Folgejahr (ausserhalb des Januars passiert nichts). Schutz via CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  return fuehreCronAus(request, "folgejahr-erinnerung", (caller) =>
    caller.folgejahr.erinnern({
      name: BRAND.name,
      shortName: BRAND.shortName,
      kanzleiName: BRAND.kanzlei.name,
    }),
  );
}
