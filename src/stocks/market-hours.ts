// Checking window: US regular trading hours only, 9:30 AM - 4:00 PM America/New_York,
// Monday-Friday. Briefly extended to include pre-market (4:00 AM start), but reverted
// (2026-07-31) after confirming Finnhub's free tier returns a frozen previous-close
// quote during pre-market/after-hours, not a live price — checking then had no value
// and risked false triggers/misses on stale data. Revisit if the stock-data provider
// ever changes (see CLAUDE.md).
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
  const windowStart = 9 * 60 + 30; // 9:30 AM ET — regular open
  const windowEnd = 16 * 60; // 4:00 PM ET — regular close

  return minutesSinceMidnight >= windowStart && minutesSinceMidnight < windowEnd;
}
