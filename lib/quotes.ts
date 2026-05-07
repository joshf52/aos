/**
 * Daily pull-quotes for the dashboard. Deterministic by day-of-year so a user
 * who reloads twice in one day sees the same line — and tomorrow's is fresh.
 */

const QUOTES: { line: string; attribution?: string }[] = [
  { line: "Make something people want.", attribution: "Paul Graham" },
  { line: "Direction beats speed." },
  { line: "Hard things take time. The interesting question is whether they're getting easier." },
  { line: "Build for the smallest possible audience first.", attribution: "Seth Godin" },
  { line: "Distribution is the moat." },
  { line: "Strong opinions, loosely held." },
  { line: "Ship the smallest test that could falsify your thesis." },
  { line: "Conviction compounds. So does drift." },
  { line: "If you are not embarrassed by the first version, you shipped too late.", attribution: "Reid Hoffman" },
];

export function dailyQuote(now = new Date()): { line: string; attribution?: string } {
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  const day = Math.floor((now.getTime() - start) / 86_400_000);
  return QUOTES[day % QUOTES.length];
}
