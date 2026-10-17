import { afterEach, describe, expect, it, vi } from "vitest";

describe("env: optionale Portal-Variablen", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function lade(werte: Record<string, string | undefined>) {
    for (const [k, v] of Object.entries(werte)) vi.stubEnv(k, v as string);
    vi.resetModules();
    return (await import("./env")).env();
  }

  it("leere Strings (wie in .env.example) gelten als nicht gesetzt", async () => {
    const e = await lade({ PORTAL_CODE_SECRET: "", TERMIN_URL: "" });
    expect(e.PORTAL_CODE_SECRET).toBeUndefined();
    expect(e.TERMIN_URL).toBeUndefined();
  });

  it("gueltige Werte kommen durch", async () => {
    const e = await lade({ PORTAL_CODE_SECRET: "x".repeat(20), TERMIN_URL: "https://cal.com/team/portal" });
    expect(e.PORTAL_CODE_SECRET).toHaveLength(20);
    expect(e.TERMIN_URL).toBe("https://cal.com/team/portal");
  });

  it("zu kurzes Geheimnis wird abgelehnt", async () => {
    await expect(lade({ PORTAL_CODE_SECRET: "kurz" })).rejects.toThrow();
  });
});
