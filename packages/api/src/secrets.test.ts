import { describe, expect, it } from "vitest";

import { decryptSecret, encryptSecret } from "./secrets";

const SECRET = "ein-langes-test-geheimnis-123";

describe("encryptSecret / decryptSecret", () => {
  it("round-trip", () => {
    const token = encryptSecret("ABCD-1234-EFGH", SECRET);
    expect(token.startsWith("v1.")).toBe(true);
    expect(decryptSecret(token, SECRET)).toBe("ABCD-1234-EFGH");
  });

  it("enthaelt den Klartext nicht und ist je Aufruf anders (zufaelliger IV)", () => {
    const a = encryptSecret("ABCD-1234-EFGH", SECRET);
    const b = encryptSecret("ABCD-1234-EFGH", SECRET);
    expect(a).not.toContain("ABCD");
    expect(a).not.toBe(b);
  });

  it("falscher Schluessel wird abgelehnt", () => {
    const token = encryptSecret("geheim", SECRET);
    expect(() => decryptSecret(token, "anderes-geheimnis-456789")).toThrow();
  });

  it("veraenderte Daten werden erkannt", () => {
    const [v, iv, tag, enc] = encryptSecret("geheim", SECRET).split(".");
    const kaputt = [v, iv, tag, Buffer.from("x" + Buffer.from(enc!, "base64url").toString("latin1"), "latin1").toString("base64url")].join(".");
    expect(() => decryptSecret(kaputt, SECRET)).toThrow();
  });

  it("unbekanntes Format", () => {
    expect(() => decryptSecret("irgendwas", SECRET)).toThrow(/Format/);
  });
});
