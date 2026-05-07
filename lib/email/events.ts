import { createServiceClient } from "@/lib/supabase/service";
import type { EmailKind, EmailStatus, Json } from "@/types/database";

/**
 * Append-only logging for transactional email lifecycle. Used by:
 * - lib/email/send.ts (logs `sent` / `failed` after each Resend dispatch)
 * - app/api/webhooks/resend/route.ts (logs delivered/bounced/complained etc.)
 *
 * Never throws. We swallow logging errors so a Supabase hiccup never breaks
 * the user-facing flow.
 */
export async function logEmailEvent(params: {
  userId: string | null;
  email: string;
  kind: EmailKind;
  status: EmailStatus;
  resendId: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const svc = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (svc.from("email_events") as any).insert({
      user_id: params.userId,
      email: params.email.toLowerCase(),
      kind: params.kind,
      status: params.status,
      resend_id: params.resendId,
      metadata: (params.metadata ?? null) as Json | null,
    });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[email_events] log failed", err);
    }
  }
}

/**
 * Returns the lowercased set of recipient addresses that have ever recorded
 * a `bounced` or `complained` event. Cron uses this to skip dead addresses.
 */
export async function fetchSuppressedAddresses(): Promise<Set<string>> {
  const svc = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (svc.from("email_events") as any)
    .select("email")
    .in("status", ["bounced", "complained"]);
  const rows = (data ?? []) as Array<{ email: string }>;
  return new Set(rows.map((r) => r.email.toLowerCase()));
}
