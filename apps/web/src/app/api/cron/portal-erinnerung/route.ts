import type { NextRequest } from "next/server";

import { BRAND } from "@/config/brand";
import { fuehreCronAus } from "@/server/cron";

export const runtime = "nodejs";

/**
 * Vercel-Cron-Endpoint — laeuft taeglich und verschickt faellige Erinnerungen zum
 * Portal-Zugang (Tag 2, 5, 10, 14 ab Unterschrift). Schutz via CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  return fuehreCronAus(request, "portal-erinnerung", (caller) =>
    caller.admin.portalErinnerungen({
      name: BRAND.name,
      shortName: BRAND.shortName,
      kanzleiName: BRAND.kanzlei.name,
    }),
  );
}
