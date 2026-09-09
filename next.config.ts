import type { NextConfig } from "next";

/**
 * Response headers.
 *
 * Cairn renders content it authored plus text its own users typed, so the
 * cheap, non-breaking hardening is worth having by default. No CSP here yet:
 * Next's inline bootstrap needs a nonce to do it properly, and a half-written
 * CSP that gets loosened until the app works again is worse than none.
 */
const securityHeaders = [
  // never let a browser second-guess a declared content type
  { key: "X-Content-Type-Options", value: "nosniff" },
  // the app is never meant to be framed — clickjacking has no upside here
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // nothing in this app asks for hardware
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
