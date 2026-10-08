/**
 * Datenblatt fuer den § 9b-Antrag als Excel-Download (TODO 1.6).
 *
 * Wird bei jedem Aufruf frisch aus dem aktuellen Stand erzeugt — sobald eine
 * neue Rechnung hochgeladen ist, steht sie hier drin. Geschuetzt durch die
 * Basic-Auth der Middleware (`/admin/*`).
 */
import { erzeugeDatenblattFuerAntrag } from "@stromsteuer/api";
import { NextResponse, type NextRequest } from "next/server";

import { BRAND } from "@/config/brand";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const datenblatt = await erzeugeDatenblattFuerAntrag(params.id, {
      brandName: BRAND.name,
      actor: "KANZLEI",
    });
    return new NextResponse(Buffer.from(datenblatt.bytes), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${datenblatt.dateiname}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    // TRPCError aus ladeAntrag, ohne @trpc/server als Web-Abhaengigkeit
    if (err instanceof Error && "code" in err && err.code === "NOT_FOUND") {
      return new NextResponse("Antrag nicht gefunden.", { status: 404 });
    }
    throw err;
  }
}
