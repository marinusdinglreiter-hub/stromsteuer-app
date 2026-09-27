import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env, hasSupabaseCredentials } from "../env";

let cached: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!hasSupabaseCredentials()) {
    throw new Error(
      "Supabase ist nicht konfiguriert. SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY in .env setzen.",
    );
  }
  if (cached) return cached;
  const e = env();
  cached = createClient(e.SUPABASE_URL!, e.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  return cached;
}

export type UploadResult = {
  /** Bucket-relativer Storage-Key, z. B. "app_abc123/1717920000-rechnung.pdf". */
  key: string;
};

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^\w.\-+]/g, "_");
}

async function uploadToBucket(
  bucket: string,
  applicationId: string,
  fileName: string,
  bytes: ArrayBuffer | Uint8Array | Buffer,
  contentType: string,
): Promise<UploadResult> {
  if (!hasSupabaseCredentials()) {
    if (!env().ALLOW_LOCAL_STORAGE_FALLBACK) {
      throw new Error(
        `Upload (${bucket}) nicht moeglich: Supabase ist nicht konfiguriert. ` +
          "SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY setzen — oder fuer lokale " +
          "Entwicklung bewusst ALLOW_LOCAL_STORAGE_FALLBACK=true (kein echter Upload).",
      );
    }
    const key = `local/${applicationId}/${Date.now()}-${sanitizeFileName(fileName)}`;
    return { key };
  }
  const supabase = getSupabase();
  const key = `${applicationId}/${Date.now()}-${sanitizeFileName(fileName)}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(key, bytes, { contentType, upsert: false });
  if (error) {
    throw new Error(`Upload (${bucket}) fehlgeschlagen: ${error.message}`);
  }
  return { key };
}

async function signedUrlFor(
  bucket: string,
  key: string,
  expiresInSeconds: number,
): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(key, expiresInSeconds);
  if (error || !data) {
    throw new Error(
      `Signed-URL konnte nicht erzeugt werden: ${error?.message ?? "unbekannt"}`,
    );
  }
  return data.signedUrl;
}

async function deleteFromBucket(bucket: string, keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const supabase = getSupabase();
  const { error } = await supabase.storage.from(bucket).remove(keys);
  if (error) {
    throw new Error(`Loeschung (${bucket}) fehlgeschlagen: ${error.message}`);
  }
}

async function downloadFromBucket(
  bucket: string,
  key: string,
): Promise<Uint8Array> {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage.from(bucket).download(key);
  if (error || !data) {
    throw new Error(
      `Download (${bucket}/${key}) fehlgeschlagen: ${error?.message ?? "unbekannt"}`,
    );
  }
  return new Uint8Array(await data.arrayBuffer());
}

/** Laedt eine Datei aus dem `belege`-Bucket als Bytes — fuer die Kanzlei-Paket-Bundelung. */
export function downloadBeleg(key: string): Promise<Uint8Array> {
  return downloadFromBucket(env().SUPABASE_BUCKET_BELEGE, key);
}

/** Laedt eine generierte Datei (z. B. das Mandat-PDF) als Bytes. */
export function downloadGenerated(key: string): Promise<Uint8Array> {
  return downloadFromBucket(env().SUPABASE_BUCKET_GENERATED, key);
}

/**
 * Laedt eine Datei in den `belege`-Bucket. Pfad bewusst nach Application-ID
 * gegliedert, damit Cron-Lifecycle pro Application loeschen kann.
 */
export function uploadBeleg(
  applicationId: string,
  fileName: string,
  bytes: ArrayBuffer | Uint8Array | Buffer,
  contentType: string,
): Promise<UploadResult> {
  return uploadToBucket(
    env().SUPABASE_BUCKET_BELEGE,
    applicationId,
    fileName,
    bytes,
    contentType,
  );
}

/** Generierte Dateien (Mandat-PDF, Signatur-PNG, Kanzlei-Paket-ZIP). */
export function uploadGenerated(
  applicationId: string,
  fileName: string,
  bytes: ArrayBuffer | Uint8Array | Buffer,
  contentType: string,
): Promise<UploadResult> {
  return uploadToBucket(
    env().SUPABASE_BUCKET_GENERATED,
    applicationId,
    fileName,
    bytes,
    contentType,
  );
}

/** Erzeugt einen kurzlebigen Download-Link (signed URL) fuer einen Beleg. */
export function getBelegDownloadUrl(
  key: string,
  expiresInSeconds = 900,
): Promise<string> {
  return signedUrlFor(env().SUPABASE_BUCKET_BELEGE, key, expiresInSeconds);
}

/** Signed-URL fuer eine generierte Datei. */
export function getGeneratedDownloadUrl(
  key: string,
  expiresInSeconds = 900,
): Promise<string> {
  return signedUrlFor(env().SUPABASE_BUCKET_GENERATED, key, expiresInSeconds);
}

/** Loescht eine Liste von Belegen (fuer Cron-Lifecycle). */
export function deleteBelege(keys: string[]): Promise<void> {
  return deleteFromBucket(env().SUPABASE_BUCKET_BELEGE, keys);
}

/** Loescht generierte Dateien (Cron-Lifecycle). */
export function deleteGenerated(keys: string[]): Promise<void> {
  return deleteFromBucket(env().SUPABASE_BUCKET_GENERATED, keys);
}
