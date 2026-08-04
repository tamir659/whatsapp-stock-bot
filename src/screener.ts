import type { Env } from "./config";
import { sendText } from "./whatsapp/send";

// Assumes the ma150-screener repo lives at this path under the same GitHub account as this
// project (see ../whatsapp-stock-bot/CLAUDE.md) and its default branch is "master" — adjust
// here if either turns out different once that repo actually exists on GitHub.
const SCREENER_REPO = "tamir659/ma150-screener";
const SCREENER_WORKFLOW = "on_demand.yml";
const SCREENER_REF = "master";

// Triggers the ma150-screener GitHub Actions job on demand, passing the requester's phone
// number as a workflow input so the job knows who to reply to when it's done (a few minutes
// later, via handleScreenerAlert below). Fire-and-forget: this call only confirms the job was
// *queued*, not that the scan succeeded — errors from the scan itself never reach the user
// beyond "no reply arrived."
export async function triggerScreenerScan(env: Env, phoneNumber: string): Promise<void> {
  const url = `https://api.github.com/repos/${SCREENER_REPO}/actions/workflows/${SCREENER_WORKFLOW}/dispatches`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.SCREENER_GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "whatsapp-stock-bot",
    },
    body: JSON.stringify({
      ref: SCREENER_REF,
      inputs: { phone_number: phoneNumber },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GitHub workflow dispatch failed (${res.status}): ${errText}`);
  }
}

interface ScreenerEntry {
  ticker: string;
  price: number;
  average: number;
  distance: number;
}

function formatMessage(entries: ScreenerEntry[]): string {
  const lines = entries.map((e) => {
    const sign = e.distance >= 0 ? "+" : "";
    return `${e.ticker}: $${e.price.toFixed(2)} (SMA150: $${e.average.toFixed(2)}, ${sign}${e.distance.toFixed(2)}%)`;
  });
  return ["20 stocks closest to their 150-day moving average:", "", ...lines].join("\n");
}

// Called by the ma150-screener GitHub Actions job once its scan finishes — authenticated with
// a shared secret header, not the Meta webhook HMAC check, since the caller isn't Meta. Always
// a reply within the 24h session window opened by the user's own "screener" command, so a
// plain free-form text message works — no pre-approved message template needed.
export async function handleScreenerAlert(request: Request, env: Env): Promise<Response> {
  const secret = request.headers.get("X-Screener-Secret");
  if (!secret || secret !== env.SCREENER_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await request.json()) as { to: string; entries: ScreenerEntry[] };
  if (!body.to || !Array.isArray(body.entries) || body.entries.length === 0) {
    return new Response("Bad request", { status: 400 });
  }

  await sendText(env, body.to, formatMessage(body.entries));
  return new Response("OK", { status: 200 });
}
