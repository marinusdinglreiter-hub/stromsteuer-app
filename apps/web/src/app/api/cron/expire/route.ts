import type { NextRequest } from "next/server";

import { fuehreCronAus } from "@/server/cron";

export const runtime = "nodejs";

/**
 * Vercel-Cron-Endpoint — laeuft taeglich, loescht abgelaufene Drafts.
 * Trigger ueber vercel.json (siehe Root). Schutz via CRON_SECRET, siehe
 * `@/server/cron`.
 */
export async function GET(request: NextRequest) {
  return fuehreCronAus(request, "expire", (caller) => caller.admin.expireDrafts());
}
