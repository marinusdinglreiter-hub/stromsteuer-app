import { cn } from "@stromsteuer/ui/lib/utils";
import type { ReactNode } from "react";

/** Einheitlicher Rahmen fuer die Sektionen der Landingpage. */
export function Section({
  id,
  title,
  lead,
  muted = false,
  children,
}: {
  id: string;
  title: string;
  lead?: ReactNode;
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-titel`}
      className={cn("scroll-mt-16 py-16 lg:py-24", muted && "border-y border-border bg-muted")}
    >
      <div className="container">
        <div className="max-w-2xl">
          <h2
            id={`${id}-titel`}
            className="font-serif text-3xl font-semibold tracking-tight sm:text-[2.125rem]"
          >
            {title}
          </h2>
          {lead ? (
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">{lead}</p>
          ) : null}
        </div>
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}
