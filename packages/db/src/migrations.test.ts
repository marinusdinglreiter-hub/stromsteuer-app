import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Wächter für die Regel aus CLAUDE.md: Jede Tabelle im Schema `public` braucht
 * Row Level Security ohne Policy. Supabase stellt Tabellen sonst unter dem
 * öffentlichen anon-Key per REST bereit (Mandanten, IBANs, Belege).
 * Eine Migration, die eine Tabelle anlegt, muss sie spätestens in derselben oder
 * einer späteren Migration mit ENABLE ROW LEVEL SECURITY versehen.
 */
const MIGRATIONS = join(__dirname, "..", "prisma", "migrations");

const ordner = readdirSync(MIGRATIONS, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

const sql = (name: string) => readFileSync(join(MIGRATIONS, name, "migration.sql"), "utf8");

const angelegt = (text: string) => [...text.matchAll(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?"([^"]+)"/gi)].map((m) => m[1]!);
const gesichert = (text: string) =>
  [...text.matchAll(/ALTER TABLE\s+(?:ONLY\s+)?"([^"]+)"\s+ENABLE ROW LEVEL SECURITY/gi)].map((m) => m[1]!);
const umbenannt = (text: string) =>
  [...text.matchAll(/ALTER TABLE\s+"([^"]+)"\s+RENAME TO\s+"([^"]+)"/gi)].map((m) => [m[1]!, m[2]!] as const);
const geloescht = (text: string) => [...text.matchAll(/DROP TABLE\s+(?:IF EXISTS\s+)?"([^"]+)"/gi)].map((m) => m[1]!);

/** Spielt die Migrationen der Reihe nach durch und liefert je Tabelle, ob RLS an ist. */
function rlsStand(migrationen: string[]): Map<string, boolean> {
  const tabellen = new Map<string, boolean>();
  for (const text of migrationen) {
    for (const t of angelegt(text)) tabellen.set(t, false);
    for (const [alt, neu] of umbenannt(text)) {
      if (tabellen.has(alt)) {
        tabellen.set(neu, tabellen.get(alt)!);
        tabellen.delete(alt);
      }
    }
    for (const t of geloescht(text)) tabellen.delete(t);
    for (const t of gesichert(text)) if (tabellen.has(t)) tabellen.set(t, true);
  }
  return tabellen;
}

describe("Migrationen: Row Level Security", () => {
  it("findet die Migrationen", () => {
    expect(ordner.length).toBeGreaterThan(0);
  });

  it("jede Tabelle im Endzustand hat RLS", () => {
    const stand = rlsStand(ordner.map(sql));
    const offen = [...stand].filter(([, rls]) => !rls).map(([name]) => name);
    expect(stand.size).toBeGreaterThan(0);
    expect(offen, `Ohne RLS: ${offen.join(", ")}. Siehe CLAUDE.md, Abschnitt Datenbank-Sicherheit.`).toEqual([]);
  });

  it("der Wächter erkennt eine fehlende Sicherung", () => {
    const stand = rlsStand(['CREATE TABLE "Neu" (id TEXT);']);
    expect([...stand]).toEqual([["Neu", false]]);
    expect([...rlsStand(['CREATE TABLE "Neu" (id TEXT);', 'ALTER TABLE "Neu" ENABLE ROW LEVEL SECURITY;'])]).toEqual([
      ["Neu", true],
    ]);
  });

  it("der Wächter folgt Umbenennungen und gelöschten Tabellen", () => {
    const stand = rlsStand([
      'CREATE TABLE "Alt" (id TEXT); CREATE TABLE "Weg" (id TEXT);',
      'ALTER TABLE "Alt" RENAME TO "Neu"; DROP TABLE "Weg";',
      'ALTER TABLE "Neu" ENABLE ROW LEVEL SECURITY;',
    ]);
    expect([...stand]).toEqual([["Neu", true]]);
  });
});
