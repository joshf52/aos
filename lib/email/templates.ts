/**
 * Editorial email templates. Plain HTML with inline styles — most clients
 * strip <style> tags. Goal: feel like a printed letter, not a SaaS broadcast.
 *
 * Palette and serif match the app: warm cream on warm ink, gold accents,
 * Cormorant Garamond fallback chain via @import.
 */

const SHELL = (inner: string, preheader: string) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>AOS</title>
  </head>
  <body style="margin:0;padding:0;background:#0A0A0C;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#F5F2ED;">
    <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0C;">
      <tr>
        <td align="center" style="padding:48px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#15151A;border:1px solid rgba(245,242,237,0.06);border-radius:24px;">
            <tr>
              <td style="padding:40px 36px 8px;">
                <div style="font-family:Georgia,'Times New Roman',serif;font-size:36px;letter-spacing:-0.04em;color:#F5F2ED;line-height:1;">AOS</div>
                <div style="margin-top:6px;font-family:Georgia,serif;font-style:italic;font-size:13px;color:#D4A574;letter-spacing:-0.01em;">Build with conviction.</div>
                <div style="margin:24px 0;height:1px;background:linear-gradient(90deg,transparent,rgba(212,165,116,0.3),transparent);"></div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 36px 40px;color:#F5F2ED;font-size:15px;line-height:1.65;">
                ${inner}
              </td>
            </tr>
          </table>
          <div style="margin-top:24px;font-size:11px;color:#5A5650;letter-spacing:0.04em;">
            AOS · A decision and leverage engine for builders
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const CTA = (href: string, label: string) => `
  <a href="${href}" style="display:inline-block;background:#F5F2ED;color:#0A0A0C;text-decoration:none;padding:14px 24px;border-radius:14px;font-weight:600;font-size:14px;letter-spacing:-0.01em;">${label}</a>
`;

export function welcomeEmail({
  name,
  appUrl,
}: {
  name: string;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `Welcome to AOS, ${name}.`;
  const preheader = "Your first opportunities are tuned and waiting.";

  const inner = `
    <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:28px;letter-spacing:-0.025em;line-height:1.15;color:#F5F2ED;font-weight:400;">
      Welcome, ${name}.
    </h1>
    <p style="margin:0 0 18px;color:#F5F2ED;">
      You signed the first covenant: that you'll show up.
    </p>
    <p style="margin:0 0 22px;color:#8A8580;">
      Twelve opportunities are tuned to your taste profile. Five are ready now;
      the rest refresh every Monday morning. Read carefully — these are real
      gaps with real demand. Pick the one that won't leave your head.
    </p>
    <p style="margin:0 0 28px;color:#8A8580;font-style:italic;font-family:Georgia,serif;">
      &mdash; The atomic unit is one shipped product. Everything else is rehearsal.
    </p>
    ${CTA(`${appUrl}/feed`, "See your opportunities →")}
    <p style="margin:32px 0 0;font-size:12px;color:#5A5650;line-height:1.5;">
      You can change your interests, audience, or build mode any time from
      <a href="${appUrl}/preferences" style="color:#D4A574;text-decoration:none;">Preferences</a>.
    </p>
  `;

  const text = `Welcome, ${name}.

You signed the first covenant: that you'll show up.

Twelve opportunities are tuned to your taste profile. Five are ready now; the rest refresh every Monday morning. Pick the one that won't leave your head.

The atomic unit is one shipped product. Everything else is rehearsal.

See your opportunities: ${appUrl}/feed

You can change your interests any time from Preferences: ${appUrl}/preferences`;

  return { subject, html: SHELL(inner, preheader), text };
}

export function checkinNudgeEmail({
  name,
  weekNumber,
  daysIn,
  opportunityTitle,
  commitmentId,
  appUrl,
}: {
  name: string;
  weekNumber: number;
  daysIn: number;
  opportunityTitle: string;
  commitmentId: string;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `Week ${weekNumber}: what shipped?`;
  const preheader = `Day ${daysIn} of your sprint. The covenant called for a check-in.`;

  const inner = `
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.16em;color:#D4A574;font-weight:500;margin-bottom:12px;">
      Week ${weekNumber} · Day ${daysIn} of 30
    </div>
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;letter-spacing:-0.025em;line-height:1.15;color:#F5F2ED;font-weight:400;">
      ${opportunityTitle}
    </h1>
    <p style="margin:0 0 18px;color:#8A8580;font-style:italic;font-family:Georgia,serif;">
      ${name}, the covenant called for a check-in this week.
    </p>
    <p style="margin:0 0 22px;color:#F5F2ED;font-size:18px;font-family:Georgia,serif;line-height:1.4;">
      What did you ship or learn?
    </p>
    <p style="margin:0 0 28px;color:#8A8580;font-size:14px;">
      One sentence. A URL, a metric, a lesson. Three minutes of writing keeps
      the sprint alive — and reveals what you actually believe.
    </p>
    ${CTA(`${appUrl}/dashboard/checkin/${commitmentId}`, "Log this week →")}
    <p style="margin:32px 0 0;font-size:12px;color:#5A5650;line-height:1.5;">
      You can pause notifications from
      <a href="${appUrl}/preferences" style="color:#D4A574;text-decoration:none;">Preferences</a>.
    </p>
  `;

  const text = `Week ${weekNumber} · Day ${daysIn} of 30

${opportunityTitle}

${name}, the covenant called for a check-in this week.

What did you ship or learn? One sentence. A URL, a metric, a lesson.

Log this week: ${appUrl}/dashboard/checkin/${commitmentId}`;

  return { subject, html: SHELL(inner, preheader), text };
}
