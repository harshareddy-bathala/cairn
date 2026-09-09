import { z } from "zod";

/**
 * Scheme allowlist for anything that will end up in an `href`.
 *
 * `z.string().url()` is not this check — it accepts `javascript:alert(1)`,
 * `data:text/html,...` and `vbscript:`, because those are all syntactically
 * valid URLs. Anything a person can type, and that another surface may later
 * render as a link, has to come through here instead.
 */
const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

/** the URL if it is safe to put in an href, otherwise null */
export function safeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;

  // Strip control characters and spaces before parsing. Browsers ignore them
  // inside a scheme, so "java\tscript:alert(1)" navigates but naive checks pass.
  const s = raw.replace(/[\u0000-\u0020]/g, "");
  if (!s) return null;

  // Site-relative links are fine; protocol-relative ("//evil.com") is not.
  if (s.startsWith("/") && !s.startsWith("//")) return s;

  try {
    const u = new URL(s);
    return SAFE_PROTOCOLS.has(u.protocol) ? u.toString() : null;
  } catch {
    return null;
  }
}

export function isSafeUrl(raw: string | null | undefined): boolean {
  return safeUrl(raw) !== null;
}

/**
 * What a person actually types into a URL field.
 *
 * Nobody types the scheme: the repo input's own placeholder says
 * `github.com/…`, and `new URL` rejects exactly that. So a bare host gets an
 * `https://` prefix before it is judged. A string that already carries a scheme
 * is left untouched, which is the point — `javascript:alert(1)` keeps its own
 * scheme and is still rejected, rather than being rewritten into something that
 * passes.
 */
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

export function normaliseUrlInput(raw: string): string {
  const s = raw.trim();
  if (!s || HAS_SCHEME.test(s) || s.startsWith("/")) return s;
  return `https://${s}`;
}

/** a required http(s) URL, for a field that will be rendered as a link */
export const safeUrlSchema = z
  .string()
  .max(500)
  .transform(normaliseUrlInput)
  .refine(isSafeUrl, "must be an http(s) URL");

/** the same, but an empty string is allowed and normalised away */
export const optionalSafeUrlSchema = z
  .string()
  .max(500)
  .optional()
  .transform((v) => normaliseUrlInput(v ?? "") || undefined)
  .refine((v) => v === undefined || isSafeUrl(v), "must be an http(s) URL");
