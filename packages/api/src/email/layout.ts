/**
 * Gemeinsames HTML-Email-Layout mit Inline-Styles (max. Kompatibilitaet).
 * Kein React, kein @react-email — fuer MVP-Templates reichen Template-Strings.
 */

export type EmailFrame = {
  preheader?: string;
  title: string;
  bodyHtml: string;
  /** Optionaler Call-to-Action-Button am Ende des Body. */
  cta?: { href: string; label: string };
  footerNote?: string;
  brandName: string;
  brandShortName: string;
};

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderEmail(frame: EmailFrame): { html: string; text: string } {
  const preheader = frame.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;visibility:hidden;">${esc(frame.preheader)}</div>`
    : "";

  const ctaHtml = frame.cta
    ? `<p style="margin:24px 0;text-align:center;">
        <a href="${frame.cta.href}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">
          ${esc(frame.cta.label)}
        </a>
      </p>`
    : "";

  const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${esc(frame.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Helvetica,Arial,sans-serif;color:#0f172a;">
  ${preheader}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
          <tr>
            <td style="padding:20px 28px;border-bottom:1px solid #e2e8f0;">
              <strong style="font-size:14px;color:#1e293b;">${esc(frame.brandShortName)}</strong>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 14px 0;font-size:20px;line-height:1.3;color:#0f172a;">${esc(frame.title)}</h1>
              <div style="font-size:14px;line-height:1.55;color:#334155;">${frame.bodyHtml}</div>
              ${ctaHtml}
              ${frame.footerNote ? `<p style="margin-top:24px;color:#64748b;font-size:12px;line-height:1.5;">${frame.footerNote}</p>` : ""}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;border-top:1px solid #e2e8f0;background:#f8fafc;font-size:11px;color:#64748b;">
              ${esc(frame.brandName)} · Diese E-Mail wurde automatisch versendet.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // Klartext-Variante als Fallback fuer Mail-Clients ohne HTML.
  const text = [
    frame.title,
    "",
    htmlToPlain(frame.bodyHtml),
    frame.cta ? `\n${frame.cta.label}: ${frame.cta.href}\n` : "",
    frame.footerNote ?? "",
    "",
    `— ${frame.brandName}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { html, text };
}

function htmlToPlain(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
