import { adminRouter } from "./routers/admin";
import { applicationRouter } from "./routers/application";
import { lieferstelleRouter } from "./routers/lieferstelle";
import { router } from "./trpc";

export const appRouter = router({
  application: applicationRouter,
  lieferstelle: lieferstelleRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
export type AppCaller = ReturnType<AppRouter["createCaller"]>;
