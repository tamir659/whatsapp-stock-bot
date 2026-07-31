// US regular trading hours: 9:30 AM - 4:00 PM America/New_York, Monday-Friday.
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
  const marketOpen = 9 * 60 + 30;
  const marketClose = 16 * 60;

  return minutesSinceMidnight >= marketOpen && minutesSinceMidnight < marketClose;
}
