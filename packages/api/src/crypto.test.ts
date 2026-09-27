import { describe, expect, it } from "vitest";

import { sha256Hex } from "./crypto";

describe("sha256Hex", () => {
  it("liefert den bekannten Vektor fuer den leeren String", () => {
    expect(sha256Hex("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("liefert den bekannten Vektor fuer 'abc'", () => {
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("ist deterministisch und byte-identisch fuer String und Uint8Array", () => {
    const bytes = new TextEncoder().encode("abc");
    expect(sha256Hex(bytes)).toBe(sha256Hex("abc"));
  });

  it("erkennt eine Ein-Byte-Aenderung (Manipulationsnachweis)", () => {
    expect(sha256Hex("Vollmacht")).not.toBe(sha256Hex("vollmacht"));
  });
});
