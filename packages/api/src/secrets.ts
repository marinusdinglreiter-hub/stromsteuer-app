import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * Verschluesselung kurzlebiger Geheimnisse (Zugangscode fuer das Zoll-Portal).
 * AES-256-GCM, Schluessel per scrypt aus `PORTAL_CODE_SECRET` abgeleitet.
 * Format: "v1.<iv>.<tag>.<ciphertext>", alles base64url.
 *
 * Der Code wird nur bis zum Einloesen durch die Kanzlei gespeichert und dann
 * geloescht. Die Verschluesselung schuetzt ihn vor DB-Dumps und Logs.
 */

const SALT = "stromsteuer-portal-code-v1";

function key(secret: string): Buffer {
  return scryptSync(secret, SALT, 32);
}

export function encryptSecret(klartext: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  const enc = Buffer.concat([cipher.update(klartext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), enc.toString("base64url")].join(".");
}

/** Wirft bei falschem Schluessel oder veraenderten Daten. */
export function decryptSecret(token: string, secret: string): string {
  const [version, iv, tag, enc] = token.split(".");
  if (version !== "v1" || !iv || !tag || !enc) {
    throw new Error("Unbekanntes Format des gespeicherten Geheimnisses.");
  }
  const decipher = createDecipheriv("aes-256-gcm", key(secret), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(enc, "base64url")), decipher.final()]).toString("utf8");
}
