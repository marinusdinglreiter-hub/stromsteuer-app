import { describe, expect, it } from "vitest";

import {
  NEUER_ZUGANG,
  faelligeErinnerung,
  istPausiert,
  pausenUpdate,
  portalFortschritt,
  portalPhase,
  stichtagsPruefung,
  wirksameTage,
  type OnboardingZugang,
} from "./onboarding";

const zugang = (over: Partial<OnboardingZugang> = {}): OnboardingZugang => ({ ...NEUER_ZUGANG, ...over });
const T0 = new Date("2026-10-01T10:00:00Z");
const nachTagen = (n: number) => new Date(T0.getTime() + n * 86_400_000);

describe("portalPhase", () => {
  it("ohne Datensatz oder ohne Angabe: ELSTER offen", () => {
    expect(portalPhase(null)).toBe("ELSTER_OFFEN");
    expect(portalPhase(zugang())).toBe("ELSTER_OFFEN");
  });

  it("die drei ELSTER-Pfade", () => {
    expect(portalPhase(zugang({ elsterStatus: "VORHANDEN" }))).toBe("PORTAL_OFFEN");
    expect(portalPhase(zugang({ elsterStatus: "BEIM_STB" }))).toBe("WARTET_AUF_STB");
    expect(portalPhase(zugang({ elsterStatus: "FEHLT" }))).toBe("WARTET_AUF_POST");
    expect(portalPhase(zugang({ elsterStatus: "BEANTRAGT" }))).toBe("WARTET_AUF_POST");
  });

  it("Zustandskette bis aktiv", () => {
    const v = { elsterStatus: "VORHANDEN" } as const;
    expect(portalPhase(zugang({ ...v, portalKontoStatus: "REGISTRIERT" }))).toBe("PORTAL_REGISTRIERT");
    expect(portalPhase(zugang({ ...v, vollmachtStatus: "ERTEILT" }))).toBe("VOLLMACHT_ERTEILT");
    expect(portalPhase(zugang({ ...v, vollmachtStatus: "CODE_EINGELOEST" }))).toBe("CODE_EINGELOEST");
    expect(portalPhase(zugang({ ...v, vollmachtStatus: "AKTIV" }))).toBe("AKTIV");
  });

  it("Nebenzustaende haben Vorrang", () => {
    expect(portalPhase(zugang({ vollmachtStatus: "SCOPE_FALSCH" }))).toBe("SCOPE_FALSCH");
    expect(portalPhase(zugang({ vollmachtStatus: "ABGELAUFEN" }))).toBe("ABGELAUFEN");
  });

  it("ein erteilter Code zaehlt auch ohne ELSTER-Angabe", () => {
    expect(portalPhase(zugang({ vollmachtStatus: "ERTEILT" }))).toBe("VOLLMACHT_ERTEILT");
  });
});

describe("portalFortschritt", () => {
  it("zaehlt abgehakte Schritte bis 80 %", () => {
    expect(portalFortschritt(zugang())).toBe(0);
    expect(portalFortschritt(zugang({ schritteErledigt: [1, 2] }))).toBe(32);
    expect(portalFortschritt(zugang({ schritteErledigt: [1, 2, 3, 4, 5] }))).toBe(80);
  });

  it("ignoriert doppelte und ungueltige Schritte", () => {
    expect(portalFortschritt(zugang({ schritteErledigt: [1, 1, 9, 0] }))).toBe(16);
  });

  it("Code und Aktivierung heben auf 80, 90 und 100 %", () => {
    expect(portalFortschritt(zugang({ vollmachtStatus: "ERTEILT" }))).toBe(80);
    expect(portalFortschritt(zugang({ vollmachtStatus: "CODE_EINGELOEST" }))).toBe(90);
    expect(portalFortschritt(zugang({ vollmachtStatus: "AKTIV" }))).toBe(100);
  });
});

describe("Erinnerungen (Tag 2, 5, 10, 14 ab Vertragsunterschrift)", () => {
  it("vor Tag 2 nichts", () => {
    expect(faelligeErinnerung(T0, nachTagen(1), zugang())).toBeNull();
  });

  it("Stufen zum richtigen Tag", () => {
    expect(faelligeErinnerung(T0, nachTagen(2), zugang())).toBe(1);
    expect(faelligeErinnerung(T0, nachTagen(5), zugang({ eskalationsstufe: 1 }))).toBe(2);
    expect(faelligeErinnerung(T0, nachTagen(10), zugang({ eskalationsstufe: 2 }))).toBe(3);
    expect(faelligeErinnerung(T0, nachTagen(14), zugang({ eskalationsstufe: 3 }))).toBe(4);
  });

  it("jede Stufe nur einmal", () => {
    expect(faelligeErinnerung(T0, nachTagen(3), zugang({ eskalationsstufe: 1 }))).toBeNull();
    expect(faelligeErinnerung(T0, nachTagen(30), zugang({ eskalationsstufe: 4 }))).toBeNull();
  });

  it("nach einer Cron-Pause: nur die hoechste erreichte Stufe, keine Mail-Flut", () => {
    expect(faelligeErinnerung(T0, nachTagen(11), zugang())).toBe(3);
  });

  it("Wartezustand Post pausiert, Steuerberater nicht", () => {
    expect(faelligeErinnerung(T0, nachTagen(10), zugang({ elsterStatus: "FEHLT", pausiertSeit: T0 }))).toBeNull();
    expect(faelligeErinnerung(T0, nachTagen(10), zugang({ elsterStatus: "BEANTRAGT", pausiertSeit: T0 }))).toBeNull();
    expect(faelligeErinnerung(T0, nachTagen(2), zugang({ elsterStatus: "BEIM_STB" }))).toBe(1);
  });

  it("bereits eingeloeste oder aktive Vollmacht: keine Erinnerung mehr", () => {
    expect(faelligeErinnerung(T0, nachTagen(20), zugang({ vollmachtStatus: "CODE_EINGELOEST" }))).toBeNull();
    expect(faelligeErinnerung(T0, nachTagen(20), zugang({ vollmachtStatus: "AKTIV" }))).toBeNull();
  });

  it("Pausenzeit wird abgezogen", () => {
    // 20 Tage vergangen, davon 12 Tage auf die Post gewartet: wirksam 8 Tage
    expect(wirksameTage(T0, nachTagen(20), zugang({ pausierteTage: 12 }))).toBe(8);
    expect(faelligeErinnerung(T0, nachTagen(20), zugang({ pausierteTage: 12, eskalationsstufe: 1 }))).toBe(2);
    // laufende Pause zaehlt ebenfalls nicht
    expect(wirksameTage(T0, nachTagen(10), zugang({ pausiertSeit: nachTagen(4) }))).toBe(4);
  });
});

describe("pausenUpdate", () => {
  it("Eintritt in den Wartezustand merkt den Zeitpunkt", () => {
    expect(pausenUpdate("UNBEKANNT", "FEHLT", nachTagen(3), null, 0)).toEqual({
      pausiertSeit: nachTagen(3),
      pausierteTage: 0,
    });
  });

  it("Austritt addiert die Dauer", () => {
    expect(pausenUpdate("BEANTRAGT", "VORHANDEN", nachTagen(13), nachTagen(3), 2)).toEqual({
      pausiertSeit: null,
      pausierteTage: 12,
    });
  });

  it("FEHLT -> BEANTRAGT bleibt in der Pause", () => {
    expect(pausenUpdate("FEHLT", "BEANTRAGT", nachTagen(5), nachTagen(3), 0)).toEqual({
      pausiertSeit: nachTagen(3),
      pausierteTage: 0,
    });
    expect(istPausiert({ elsterStatus: "BEANTRAGT" })).toBe(true);
    expect(istPausiert({ elsterStatus: "BEIM_STB" })).toBe(false);
  });
});

describe("stichtagsPruefung (Verbrauchsjahr 2025, Frist 31.12.2026)", () => {
  const pruefe = (iso: string, elster: OnboardingZugang["elsterStatus"] = "UNBEKANNT") =>
    stichtagsPruefung(2025, new Date(`${iso}T12:00:00Z`), elster).status;

  it("bis 10.11. alles im Zeitplan", () => {
    expect(pruefe("2026-10-17")).toBe("ok");
    expect(pruefe("2026-11-10")).toBe("ok");
  });

  it("11. bis 24.11.: mit Zertifikat ok, sonst knapp", () => {
    expect(pruefe("2026-11-11", "VORHANDEN")).toBe("ok");
    expect(pruefe("2026-11-11")).toBe("knapp");
    expect(pruefe("2026-11-24", "FEHLT")).toBe("knapp");
  });

  it("ab 25.11. zu spaet, auch mit Zertifikat", () => {
    expect(pruefe("2026-11-25", "VORHANDEN")).toBe("zu-spaet");
    expect(pruefe("2026-12-20")).toBe("zu-spaet");
  });

  it("gibt die Stichtage zurueck", () => {
    const r = stichtagsPruefung(2025, new Date("2026-10-17T12:00:00Z"));
    expect(r.ausschlussfrist).toEqual({ jahr: 2026, monat: 12, tag: 31 });
    expect(r.startMitZertifikat).toEqual({ jahr: 2026, monat: 11, tag: 24 });
    expect(r.startOhneZertifikat).toEqual({ jahr: 2026, monat: 11, tag: 10 });
  });

  it("rechnet den Kalendertag in Berliner Zeit (24.11. 23:30 Uhr UTC ist schon der 25.)", () => {
    expect(stichtagsPruefung(2025, new Date("2026-11-24T23:30:00Z"), "VORHANDEN").status).toBe("zu-spaet");
    expect(stichtagsPruefung(2025, new Date("2026-11-24T22:30:00Z"), "VORHANDEN").status).toBe("ok");
  });
});
