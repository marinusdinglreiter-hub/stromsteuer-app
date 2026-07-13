/**
 * Demo-Route: legt eine vorausgefuellte Muster-Application an und leitet
 * direkt auf Schritt 2 weiter. Nur fuer lokale Entwicklung gedacht.
 *
 * Aufruf: GET /antrag/demo
 */
import { randomBytes } from "node:crypto";

import { prisma } from "@stromsteuer/db";
import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/server/session";

export async function GET(request: NextRequest) {
  const sessionToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  const application = await prisma.application.create({
    data: {
      sessionToken,
      expiresAt,
      antragsjahr: 2025,
      branche: "verarbeitendes-gewerbe",
      geschaetzteKwh: 48560,
      // Schritt 1 bereits ausgefüllt
      lieferstellen: {
        create: {
          firmenname: "Stadtwerke Musterhausen GmbH",
          adresse: "Industriestraße 27, 54321 Beispielstadt",
          plz: "54321",
          jahresKwh: 48560,
          belegFileKeys: [],
          ocrConfidence: 0.75,
        },
      },
    },
  });

  void application; // wird nur fuer den Session-Cookie gebraucht

  const target = new URL(
    "/antrag/schritt-2/lieferstellen",
    request.nextUrl.origin,
  );
  const response = NextResponse.redirect(target, { status: 302 });
  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, SESSION_COOKIE_OPTIONS);
  return response;
}
