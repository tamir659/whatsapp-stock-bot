// Checking window: US pre-market + regular hours, 4:00 AM - 4:00 PM America/New_York,
// Monday-Friday. (Deliberately excludes after-hours — user only asked to add
// pre-market, not after-market.) Anchored to America/New_York (not a fixed Israel
// local hour) so it stays correct across both countries' independent DST transitions.
// Deliberately doesn't account for market holidays (Thanksgiving, etc.) — on those
// days this will harmlessly check anyway; not worth the added complexity for a
// personal bot (see CLAUDE.md).
export function isMarketOpen(now: Date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = get("weekday");
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));

  if (weekday === "Sat" || weekday === "Sun") return false;

  const minutesSinceMidnight = hour * 60 + minute;
  const windowStart = 4 * 60; // 4:00 AM ET — pre-market open
  const windowEnd = 16 * 60; // 4:00 PM ET — regular close

  return minutesSinceMidnight >= windowStart && minutesSinceMidnight < windowEnd;
}
