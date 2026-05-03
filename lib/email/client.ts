import { Resend } from "resend";

let cached: Resend | null = null;

/**
 * Lazily-initialized Resend client. Returns null when the API key isn't set
 * so callers can no-op cleanly in dev without crashing.
 */
export function getResend(): Resend | null {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  cached = new Resend(key);
  return cached;
}

export const FROM_ADDRESS =
  process.env.RESEND_FROM_ADDRESS ?? "AOS <hello@aos.app>";
