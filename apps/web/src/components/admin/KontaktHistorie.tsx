"use client";

import { Badge } from "@stromsteuer/ui/badge";
import { Button } from "@stromsteuer/ui/button";
import { Callout } from "@stromsteuer/ui/callout";
import { FileText, Mail, Phone, StickyNote } from "lucide-react";
import { useState, useTransition } from "react";

import { adminKontaktErfassenAction } from "@/app/admin/actions";

type Kanal = "EMAIL" | "TELEFON" | "NOTIZ" | "PORTAL";
type Richtung = "AUSGEHEND" | "EINGEHEND" | "INTERN";

export type KontaktEintrag = {
  id: string;
  kanal: Kanal;
  richtung: Richtung;
  betreff: string;
  text: string | null;
  automatisch: boolean;
  erstelltVon: string | null;
  /** ISO-Zeitstempel */
  createdAt: string;
};

const KANAL: Record<Kanal, { label: string; icon: typeof Mail }> = {
  EMAIL: { label: "E-Mail", icon: Mail },
  TELEFON: { label: "Telefon", icon: Phone },
  NOTIZ: { label: "Notiz", icon: StickyNote },
  PORTAL: { label: "Portal", icon: FileText },
};

const RICHTUNG: Record<Richtung, string> = {
  AUSGEHEND: "an Kunde",
  EINGEHEND: "vom Kunde",
  INTERN: "intern",
};

function zeit(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function KontaktHistorie({
  antragId,
  eintraege,
  mandantVorhanden,
}: {
  antragId: string;
  eintraege: KontaktEintrag[];
  mandantVorhanden: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [kanal, setKanal] = useState<Kanal>("TELEFON");
  const [richtung, setRichtung] = useState<Richtung>("EINGEHEND");
  const [betreff, setBetreff] = useState("");
  const [text, setText] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);

  function speichern(e: React.FormEvent) {
    e.preventDefault();
    setFehler(null);
    startTransition(async () => {
      const res = await adminKontaktErfassenAction({ id: antragId, kanal, richtung, betreff, text });
      if (res.ok) {
        setBetreff("");
        setText("");
      } else {
        setFehler(res.error);
      }
    });
  }

  return (
    <div className="space-y-4 text-sm">
      <form onSubmit={speichern} className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Kanal</span>
            <select
              value={kanal}
              onChange={(e) => setKanal(e.target.value as Kanal)}
              className="block h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              {(Object.keys(KANAL) as Kanal[]).map((k) => (
                <option key={k} value={k}>
                  {KANAL[k].label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Richtung</span>
            <select
              value={richtung}
              onChange={(e) => setRichtung(e.target.value as Richtung)}
              className="block h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              {(Object.keys(RICHTUNG) as Richtung[]).map((r) => (
                <option key={r} value={r}>
                  {RICHTUNG[r]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <input
          value={betreff}
          onChange={(e) => setBetreff(e.target.value)}
          placeholder="Betreff, z. B. Rückruf wegen Portal-Zugang"
          aria-label="Betreff"
          maxLength={300}
          className="block h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Notiz (optional)"
          aria-label="Notiz"
          rows={2}
          maxLength={5000}
          className="block w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
        />
        <Button type="submit" size="sm" variant="outline" disabled={pending || !mandantVorhanden || betreff.trim().length < 2}>
          Eintrag speichern
        </Button>
        {fehler ? (
          <Callout variant="danger" className="text-xs">
            {fehler}
          </Callout>
        ) : null}
      </form>

      {eintraege.length === 0 ? (
        <p className="text-xs text-muted-foreground">Noch keine Kontakte erfasst.</p>
      ) : (
        <ol className="space-y-3 border-l border-border pl-4">
          {eintraege.map((e) => {
            const Icon = KANAL[e.kanal].icon;
            return (
              <li key={e.id} className="relative">
                <span className="absolute -left-[22px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-background ring-1 ring-border">
                  <Icon className="h-2.5 w-2.5 text-muted-foreground" aria-hidden />
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium">{e.betreff}</span>
                  <Badge variant="neutral">{RICHTUNG[e.richtung]}</Badge>
                  {e.automatisch ? <Badge variant="info">automatisch</Badge> : null}
                </div>
                <div className="text-xs text-muted-foreground">
                  {zeit(e.createdAt)} · {KANAL[e.kanal].label}
                  {e.erstelltVon ? ` · ${e.erstelltVon}` : ""}
                </div>
                {e.text ? <p className="mt-1 whitespace-pre-wrap text-xs">{e.text}</p> : null}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
