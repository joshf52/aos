import { getResend, FROM_ADDRESS } from "./client";
import { welcomeEmail, checkinNudgeEmail } from "./templates";

const APP_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

/**
 * Fire-and-forget email sends. Never throw — the user-facing flow is more
 * important than a transactional email. We log to console in dev so failures
 * are visible, and rely on Resend's dashboard for production observability.
 */

export async function sendWelcome({
  to,
  name,
}: {
  to: string;
  name: string;
}): Promise<{ ok: boolean }> {
  const client = getResend();
  if (!client) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[email] RESEND_API_KEY not set, skipping welcome email");
    }
    return { ok: false };
  }
  const { subject, html, text } = welcomeEmail({ name, appUrl: APP_URL });
  try {
    await client.emails.send({ from: FROM_ADDRESS, to, subject, html, text });
    return { ok: true };
  } catch (err) {
    console.error("[email] welcome send failed", err);
    return { ok: false };
  }
}

export async function sendCheckinNudge({
  to,
  name,
  weekNumber,
  daysIn,
  opportunityTitle,
  commitmentId,
}: {
  to: string;
  name: string;
  weekNumber: number;
  daysIn: number;
  opportunityTitle: string;
  commitmentId: string;
}): Promise<{ ok: boolean }> {
  const client = getResend();
  if (!client) return { ok: false };
  const { subject, html, text } = checkinNudgeEmail({
    name,
    weekNumber,
    daysIn,
    opportunityTitle,
    commitmentId,
    appUrl: APP_URL,
  });
  try {
    await client.emails.send({ from: FROM_ADDRESS, to, subject, html, text });
    return { ok: true };
  } catch (err) {
    console.error("[email] checkin nudge send failed", err);
    return { ok: false };
  }
}
