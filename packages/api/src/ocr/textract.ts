import {
  AnalyzeDocumentCommand,
  TextractClient,
} from "@aws-sdk/client-textract";

import { env, hasAwsCredentials } from "../env";
import { parseStromrechnung, type ParsedBeleg } from "./parser";

let cached: TextractClient | null = null;

function getClient(): TextractClient {
  if (!hasAwsCredentials()) {
    throw new Error(
      "AWS-Credentials fuer Textract fehlen. AWS_ACCESS_KEY_ID und AWS_SECRET_ACCESS_KEY in .env setzen.",
    );
  }
  if (cached) return cached;
  const e = env();
  cached = new TextractClient({
    region: e.AWS_REGION,
    credentials: {
      accessKeyId: e.AWS_ACCESS_KEY_ID!,
      secretAccessKey: e.AWS_SECRET_ACCESS_KEY!,
    },
  });
  return cached;
}

/**
 * Schickt eine PDF/JPG/PNG an AWS Textract (sync AnalyzeDocument) und gibt
 * das geparste Ergebnis zurueck. Sync-Variante hat 5 MB Limit pro Dokument;
 * fuer groessere oder mehrseitige PDFs braucht es StartDocumentAnalysis +
 * S3 (Phase 2).
 */
export async function ocrStromrechnung(
  bytes: Uint8Array,
): Promise<ParsedBeleg> {
  const client = getClient();
  const command = new AnalyzeDocumentCommand({
    Document: { Bytes: bytes },
    FeatureTypes: ["TABLES", "FORMS"],
  });
  const response = await client.send(command);
  return parseStromrechnung({ Blocks: response.Blocks ?? [] });
}

export function isOcrAvailable(): boolean {
  return hasAwsCredentials();
}
