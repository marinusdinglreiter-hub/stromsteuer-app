/** @type {import('next').NextConfig} */

// Im Dev-Modus braucht Next.js (HMR / React Refresh) eval + einen
// WebSocket-Kanal. In Produktion bleibt die CSP bewusst streng (kein
// 'unsafe-eval'), da der Prod-Build ohne eval auskommt.
const isDev = process.env.NODE_ENV !== "production";

const scriptSrc = [
  "script-src",
  "'self'",
  "'unsafe-inline'",
  ...(isDev ? ["'unsafe-eval'"] : []),
  "https://plausible.io",
].join(" ");

const connectSrc = [
  "connect-src",
  "'self'",
  "https://plausible.io",
  ...(isDev ? ["ws://localhost:*"] : []),
].join(" ");

/**
 * Security-Header fuer alle Routen. Bewusst konservativ:
 * - CSP erlaubt nur self + inline-Styles (Tailwind) und das Plausible-Script.
 *   Im Dev zusaetzlich 'unsafe-eval' + HMR-WebSocket (siehe oben).
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
      scriptSrc,
      connectSrc,
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
