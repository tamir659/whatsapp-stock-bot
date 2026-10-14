import type { Env } from "./config";
import { sendMessage } from "./telegram/send";

// The ma150-screener repo, pushed 2026-08-04 under the same GitHub account as this project
// (see ../whatsapp-stock-bot/CLAUDE.md), default branch "main" — confirmed via the actual push.
const SCREENER_REPO = "tamir659/ma150-screener";
const SCREENER_WORKFLOW = "on_demand.yml";
const REBOUND_WORKFLOW = "rebound.yml";
const SCREENER_REF = "main";

async function dispatchWorkflow(env: Env, workflow: string, inputs: Record<string, string>): Promise<void> {
  const url = `https://api.github.com/repos/${SCREENER_REPO}/actions/workflows/${workflow}/dispatches`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.SCREENER_GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "whatsapp-stock-bot",
    },
    body: JSON.stringify({ ref: SCREENER_REF, inputs }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GitHub workflow dispatch failed (${res.status}): ${errText}`);
  }
}

// Triggers the ma150-screener GitHub Actions job on demand, passing the requester's chat ID
// as a workflow input so the job knows who to reply to when it's done (a few minutes later, via
// handleScreenerAlert below). Fire-and-forget: this call only confirms the job was *queued*,
// not that the scan succeeded — errors from the scan itself never reach the user beyond
// "no reply arrived."
export async function triggerScreenerScan(env: Env, chatId: string, period: 150 | 20): Promise<void> {
  await dispatchWorkflow(env, SCREENER_WORKFLOW, { phone_number: chatId, period: String(period) });
}

// Same dispatch mechanism, different workflow — the "rebound" deep-dive screener (ATH distance
// + RSI + AI analysis). Separate workflow file so a slow/failing AI-analysis run can never
// affect the fast, already-proven SMA150/20 screener above.
export async function triggerReboundScan(env: Env, chatId: string): Promise<void> {
  await dispatchWorkflow(env, REBOUND_WORKFLOW, { phone_number: chatId });
}

interface ScreenerEntry {
  ticker: string;
  price: number;
  average: number;
  distance: number;
}

function formatMessage(entries: ScreenerEntry[], period: number): string {
  const lines = entries.map((e) => {
    const sign = e.distance >= 0 ? "+" : "";
    return `${e.ticker}: $${e.price.toFixed(2)} (SMA${period}: $${e.average.toFixed(2)}, ${sign}${e.distance.toFixed(2)}%)`;
  });
  return [`${entries.length} stocks closest to their ${period}-day moving average:`, "", ...lines].join("\n");
}

interface ReboundEntry {
  ticker: string;
  price: number;
  pctBelowAth: number;
  rsi: number;
  analysis: string;
}

function formatReboundMessage(entries: ReboundEntry[]): string {
  const blocks = entries.map((e) =>
    [
      `${e.ticker}: $${e.price.toFixed(2)} — ${e.pctBelowAth.toFixed(1)}% below all-time high, RSI ${e.rsi.toFixed(1)}`,
      "",
      e.analysis,
    ].join("\n")
  );
  return [`${entries.length} oversold stock(s) well below their all-time high:`, "", blocks.join("\n\n—\n\n")].join(
    "\n"
  );
}

// Called by the ma150-screener GitHub Actions job once its scan finishes — authenticated with
// a shared secret header, not the Telegram secret-token check, since the caller is GitHub
// Actions, not Telegram. A plain text message, same as any other reply.
export async function handleScreenerAlert(request: Request, env: Env): Promise<Response> {
  const secret = request.headers.get("X-Screener-Secret");
  // .trim(): a stray trailing newline in a copy-pasted secret is a known failure mode here
  // (confirmed live, 2026-08-04, on the ma150-screener/GitHub Actions side) — don't let the
  // same class of bug cause a silent auth mismatch on this side too.
  if (!secret || secret.trim() !== env.SCREENER_SECRET.trim()) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await request.json()) as {
    to: string;
    kind?: "sma" | "rebound";
    entries?: ScreenerEntry[] | ReboundEntry[];
    error?: string;
    period?: number;
  };
  if (!body.to) {
    return new Response("Bad request", { status: 400 });
  }

  // The scan itself (GitHub Actions job) can fail partway through — network hiccups, a
  // rate-limited data source, etc. Without this branch, a failure there just meant silence:
  // the user got the "scanning..." ack and then nothing, ever, with no way to tell a real
  // failure apart from "still running." screener.py/rebound_screener.py report failures here
  // explicitly.
  if (body.error) {
    const label = body.kind === "rebound" ? "the rebound scan" : `the ${body.period ?? 150}-day scan`;
    await sendMessage(env, body.to, `Couldn't finish ${label}: ${body.error}. Try again in a bit.`);
    return new Response("OK", { status: 200 });
  }

  if (!Array.isArray(body.entries)) {
    return new Response("Bad request", { status: 400 });
  }

  // A zero-result scan is a legitimate outcome for a threshold-based screener (unlike the
  // fixed-size SMA top-20), not an error — tell the user plainly instead of staying silent.
  if (body.entries.length === 0) {
    const message =
      body.kind === "rebound"
        ? "No stocks currently match the rebound criteria (30%+ below their all-time high and RSI under 30). Try again another day."
        : `No results from the ${body.period ?? 150}-day scan.`;
    await sendMessage(env, body.to, message);
    return new Response("OK", { status: 200 });
  }

  const reply =
    body.kind === "rebound"
      ? formatReboundMessage(body.entries as ReboundEntry[])
      : formatMessage(body.entries as ScreenerEntry[], body.period ?? 150);
  await sendMessage(env, body.to, reply);
  return new Response("OK", { status: 200 });
}
