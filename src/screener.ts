import type { Env } from "./config";
import { sendScreenerAlert } from "./whatsapp/send";

interface ScreenerEntry {
  ticker: string;
  price: number;
  average: number;
  distance: number;
}

function formatSummary(entries: ScreenerEntry[]): string {
  return entries
    .map((e) => {
      const sign = e.distance >= 0 ? "+" : "";
      return `${e.ticker} ${sign}${e.distance.toFixed(1)}%`;
    })
    .join(", ");
}

// Called by the ma150-screener project's daily GitHub Actions run, not by Meta —
// authenticated with a shared secret header, not the Meta webhook HMAC check.
export async function handleScreenerAlert(request: Request, env: Env): Promise<Response> {
  const secret = request.headers.get("X-Screener-Secret");
  if (!secret || secret !== env.SCREENER_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const entries = (await request.json()) as ScreenerEntry[];
  if (!Array.isArray(entries) || entries.length === 0) {
    return new Response("No entries", { status: 400 });
  }

  const summary = formatSummary(entries);
  const recipients = env.SCREENER_RECIPIENTS.split(",")
    .map((r) => r.trim())
    .filter(Boolean);

  for (const to of recipients) {
    await sendScreenerAlert(env, to, summary);
  }

  return new Response("OK", { status: 200 });
}
