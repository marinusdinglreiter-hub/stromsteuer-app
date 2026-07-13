/** @type {import('next').NextConfig} */

/**
 * Security-Header fuer alle Routen. Bewusst konservativ:
 * - CSP erlaubt nur self + inline-Styles (Tailwind) und das Plausible-Script.
 * - X-Frame-Options DENY verhindert Clickjacking (Status-/Antragsseiten).
 * - HSTS erzwingt HTTPS (greift nur ueber HTTPS-Verbindungen).
 */
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "img-src 'self' data: blob:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' https://plausible.io",
      "connect-src 'self' https://plausible.io",
      "font-src 'self' data:",
      "object-src 'none'",
    ].join("; "),
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@stromsteuer/api",
    "@stromsteuer/db",
    "@stromsteuer/ui",
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
