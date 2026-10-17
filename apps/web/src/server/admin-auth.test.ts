import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { gleichInKonstanterZeit, pruefeAdminAuth } from "./admin-auth";

const basic = (nutzer: string, passwort: string) => `Basic ${btoa(`${nutzer}:${passwort}`)}`;

describe("pruefeAdminAuth", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_USERNAME", "kanzlei");
    vi.stubEnv("ADMIN_PASSWORD", "geheim:mit:doppelpunkten");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("richtige Zugangsdaten", () => {
    expect(pruefeAdminAuth(basic("kanzlei", "geheim:mit:doppelpunkten"))).toBe("ok");
  });

  it("Passwort darf Doppelpunkte enthalten", () => {
    expect(pruefeAdminAuth(basic("kanzlei", "geheim"))).toBe("abgelehnt");
  });

  it("falscher Nutzer oder falsches Passwort", () => {
    expect(pruefeAdminAuth(basic("admin", "geheim:mit:doppelpunkten"))).toBe("abgelehnt");
    expect(pruefeAdminAuth(basic("kanzlei", "falsch"))).toBe("abgelehnt");
  });

  it("ohne oder mit kaputtem Header", () => {
    expect(pruefeAdminAuth(null)).toBe("abgelehnt");
    expect(pruefeAdminAuth(undefined)).toBe("abgelehnt");
    expect(pruefeAdminAuth("Bearer abc")).toBe("abgelehnt");
    expect(pruefeAdminAuth("Basic !!!kein-base64")).toBe("abgelehnt");
    expect(pruefeAdminAuth(`Basic ${btoa("ohne-doppelpunkt")}`)).toBe("abgelehnt");
  });

  it("ohne ADMIN_PASSWORD ist das Backoffice gesperrt, auch mit leerem Passwort im Header", () => {
    vi.stubEnv("ADMIN_PASSWORD", "");
    expect(pruefeAdminAuth(basic("kanzlei", ""))).toBe("nicht-konfiguriert");
  });

  it("Standard-Nutzername ist admin", () => {
    vi.stubEnv("ADMIN_USERNAME", undefined as unknown as string);
    delete process.env.ADMIN_USERNAME;
    expect(pruefeAdminAuth(basic("admin", "geheim:mit:doppelpunkten"))).toBe("ok");
  });
});

describe("gleichInKonstanterZeit", () => {
  it("vergleicht korrekt, auch bei unterschiedlicher Laenge", () => {
    expect(gleichInKonstanterZeit("abc", "abc")).toBe(true);
    expect(gleichInKonstanterZeit("abc", "abd")).toBe(false);
    expect(gleichInKonstanterZeit("abc", "abcd")).toBe(false);
    expect(gleichInKonstanterZeit("", "")).toBe(true);
    expect(gleichInKonstanterZeit("", "a")).toBe(false);
  });
});
