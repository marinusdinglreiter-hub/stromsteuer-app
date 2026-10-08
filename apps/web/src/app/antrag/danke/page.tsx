import { CheckCircle2, ExternalLink, Mail } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { triggerSubmitAction } from "@/app/antrag/schritt-3/submit-action";
import { Logo } from "@/components/brand/Logo";
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
    <div className="min-h-screen bg-muted">
      <header className="border-b border-border bg-background">
        <div className="container flex h-14 items-center">
          <Logo />
        </div>
      </header>
      <div className="container py-12 lg:py-16">
        <div className="mx-auto max-w-xl rounded-xl border border-border bg-card p-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success">
            <CheckCircle2 className="h-7 w-7" aria-hidden />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            Vielen Dank, Ihr Antrag ist unterwegs
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ihre Unterlagen sind bei {BRAND.kanzlei.name} eingegangen. Die Kanzlei
            prüft den Antrag und reicht ihn beim Hauptzollamt ein.
          </p>

          {application.mandant?.email ? (
            <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
              <Mail className="h-4 w-4 shrink-0" aria-hidden />
              Die Bestätigung und die unterzeichneten Verträge haben wir an{" "}
              <strong className="text-foreground">{application.mandant.email}</strong>{" "}
              geschickt.
            </div>
          ) : null}

          <div className="mt-8 space-y-2">
            <Link
              href={statusUrl}
              className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-[15px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Status meines Antrags ansehen
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </Link>
            <p className="text-xs text-muted-foreground">
              Über diesen Link bleibt Ihr Antragsstatus 30 Tage abrufbar.
            </p>
          </div>

          <div className="mt-6 text-xs text-muted-foreground">
            Vorgang: <span className="font-mono">{application.id}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
