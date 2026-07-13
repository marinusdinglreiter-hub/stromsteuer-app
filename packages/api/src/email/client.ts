import { Resend } from "resend";

import { env } from "../env";

let cached: Resend | null = null;

function getClient(): Resend | null {
  const e = env();
  if (!e.RESEND_API_KEY) return null;
  if (cached) return cached;
  cached = new Resend(e.RESEND_API_KEY);
  return cached;
}

export type SendMailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export type SendMailResult =
  | { ok: true; id: string }
  | { ok: false; reason: "no-api-key" | "send-failed"; error?: string };

/**
 * Versendet eine HTML-Mail via Resend. Wenn RESEND_API_KEY fehlt, gibt die
 * Funktion `{ ok: false, reason: "no-api-key" }` zurueck und protokolliert
 * den Inhalt auf der Konsole — so wird der Flow im lokalen Dev nicht blockiert.
 */
export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const e = env();
  const client = getClient();
  if (!client) {
    console.warn(
      `[email] RESEND_API_KEY fehlt — Mail nicht versendet. Subject: "${input.subject}"`,
    );
    return { ok: false, reason: "no-api-key" };
  }
  const { data, error } = await client.emails.send({
    from: e.RESEND_FROM_EMAIL,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
  });
  if (error) {
    return { ok: false, reason: "send-failed", error: error.message };
  }
  return { ok: true, id: data?.id ?? "" };
}

export function isEmailConfigured(): boolean {
  return Boolean(env().RESEND_API_KEY);
}
