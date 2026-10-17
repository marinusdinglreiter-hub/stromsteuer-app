/**
 * Folgejahre (TODO 2.3). Erreichbar ueber den Magic-Link /status/<token> des
 * Vorjahres-Antrags; `starten` legt den neuen Antrag an und gibt dessen
 * Session-Token zurueck (der Aufrufer setzt den Cookie).
 */
import { z } from "zod";

import { folgejahrAngebot, sendeFolgejahrErinnerungen, starteFolgejahr } from "../folgejahr-service";
import { adminProcedure, publicProcedure, router } from "../trpc";

const token = z.string().min(10).max(200);

export const folgejahrRouter = router({
  angebot: publicProcedure.input(z.object({ token })).query(({ input }) => folgejahrAngebot(input.token)),

  starten: publicProcedure
    .input(z.object({ token }))
    .mutation(({ ctx, input }) => starteFolgejahr(input.token, { ip: ctx.ip, userAgent: ctx.userAgent })),

  /** Taeglicher Lauf (Cron): im Januar Erinnerung an Bestandskunden. */
  erinnern: adminProcedure
    .input(z.object({ name: z.string().min(1), shortName: z.string().min(1), kanzleiName: z.string().min(1) }))
    .mutation(({ input }) => sendeFolgejahrErinnerungen(input)),
});
