import { cn } from "@stromsteuer/ui/lib/utils";
import Link from "next/link";

import { BRAND } from "@/config/brand";

/**
 * Bildmarke "§" im Quadrat plus Wortmarke. Platzhalter, bis der Markenname
 * steht — Farbe und Form entsprechen `app/icon.svg`.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ink font-serif text-lg font-semibold leading-none text-ink-foreground",
        className,
      )}
    >
      §
    </span>
  );
}

export function Logo({
  href = "/",
  inverted = false,
  label = BRAND.name,
}: {
  href?: string;
  /** Helle Variante fuer dunkle Kopfleisten (Backoffice). */
  inverted?: boolean;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2.5 whitespace-nowrap rounded-md text-[15px] font-semibold tracking-tight",
        inverted ? "text-ink-foreground" : "text-ink",
      )}
    >
      <LogoMark
        className={inverted ? "bg-ink-foreground text-ink" : undefined}
      />
      {label}
    </Link>
  );
}
