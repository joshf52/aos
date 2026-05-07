import { getResend, FROM_ADDRESS } from "./client";
import { welcomeEmail, checkinNudgeEmail } from "./templates";
import { logEmailEvent } from "./events";

const APP_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

/**
 * Fire-and-forget email sends. Never throw — the user-facing flow is more
 * important than a transactional email. We log to console in dev so failures
 * are visible, log every send to email_events for observability, and rely on
 * Resend's dashboard for production debugging.
 */

export async function sendWelcome({
  to,
  name,
  userId,
}: {
  to: string;
  name: string;
  userId?: string | null;
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
    const { data, error } = await client.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
      text,
    });
    if (error) {
      console.error("[email] welcome send failed", error);
      await logEmailEvent({
        userId: userId ?? null,
        email: to,
        kind: "welcome",
        status: "failed",
        resendId: null,
        metadata: { error: error.message ?? String(error) },
      });
      return { ok: false };
    }
    await logEmailEvent({
      userId: userId ?? null,
      email: to,
      kind: "welcome",
      status: "sent",
      resendId: data?.id ?? null,
    });
    return { ok: true };
  } catch (err) {
    console.error("[email] welcome send failed", err);
    await logEmailEvent({
      userId: userId ?? null,
      email: to,
      kind: "welcome",
      status: "failed",
      resendId: null,
      metadata: { error: err instanceof Error ? err.message : String(err) },
    });
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
  userId,
}: {
  to: string;
  name: string;
  weekNumber: number;
  daysIn: number;
  opportunityTitle: string;
  commitmentId: string;
  userId?: string | null;
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
  const meta = { commitment_id: commitmentId, week_number: weekNumber };
  try {
    const { data, error } = await client.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
      text,
    });
    if (error) {
      console.error("[email] checkin nudge send failed", error);
      await logEmailEvent({
        userId: userId ?? null,
        email: to,
        kind: "checkin_nudge",
        status: "failed",
        resendId: null,
        metadata: { ...meta, error: error.message ?? String(error) },
      });
      return { ok: false };
    }
    await logEmailEvent({
      userId: userId ?? null,
      email: to,
      kind: "checkin_nudge",
      status: "sent",
      resendId: data?.id ?? null,
      metadata: meta,
    });
    return { ok: true };
  } catch (err) {
    console.error("[email] checkin nudge send failed", err);
    await logEmailEvent({
      userId: userId ?? null,
      email: to,
      kind: "checkin_nudge",
      status: "failed",
      resendId: null,
      metadata: { ...meta, error: err instanceof Error ? err.message : String(err) },
    });
    return { ok: false };
  }
}
