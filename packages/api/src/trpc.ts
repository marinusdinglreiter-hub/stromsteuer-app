import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import type { Context } from "./context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Procedure die eine bestehende Application im Context erwartet.
 * Bootstrap-Procedure laeuft separat als publicProcedure.
 */
export const applicationProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.application) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Kein laufender Antrag im Cookie gefunden. Bitte neu starten.",
    });
  }
  return next({
    ctx: {
      ...ctx,
      application: ctx.application,
    },
  });
});

/**
 * Procedure fuer Backoffice-Endpoints — verlangt ctx.isAdmin === true.
 * Auth-Pruefung passiert in der Middleware (Basic-Auth); hier nur Guard.
 */
export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.isAdmin) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Backoffice-Zugriff erforderlich.",
    });
  }
  return next({ ctx });
});
