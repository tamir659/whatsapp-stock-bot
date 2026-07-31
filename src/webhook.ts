import type { Env } from "./config";
import { AGENT_HISTORY_TURN_LIMIT } from "./config";
import { extractMessages, type InboundWebhookPayload } from "./whatsapp/types";
import { sendText } from "./whatsapp/send";
import { verifySignature } from "./whatsapp/verify";
import { parseCommand } from "./commands/parser";
import { handleAdd } from "./commands/add";
import { handleRemove } from "./commands/remove";
import { handleList } from "./commands/list";
import { handlePrices } from "./commands/prices";
import { handleClear } from "./commands/clear";
import { runAgent } from "./agent/loop";
import { appendTurn, getRecentTurns, trimHistory } from "./db/conversation";

const HELP_TEXT = [
  "Commands:",
  "add TICKER PRICE — e.g. add AAPL 220 (you can add the same ticker more than once with different targets)",
  "add TICKER above|below PRICE",
  "add TICKER near PRICE PCT% — e.g. add AAPL near 220 2%",
  "remove TICKER — removes every entry for that ticker",
  "list",
  "prices — current live prices for your watchlist",
  "clear — removes your entire watchlist",
].join("\n");

// Meta calls this once when you save the webhook URL in the WhatsApp Configuration page.
function handleVerification(request: Request, env: Env): Response {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

async function handleIncomingMessages(request: Request, env: Env): Promise<Response> {
  const rawBody = await request.text();
  const signature = request.headers.get("X-Hub-Signature-256");
  const isValid = await verifySignature(rawBody, signature, env.WHATSAPP_APP_SECRET);
  if (!isValid) {
    return new Response("Invalid signature", { status: 401 });
  }

  const payload = JSON.parse(rawBody) as InboundWebhookPayload;
  const messages = extractMessages(payload);

  for (const msg of messages) {
    const cmd = parseCommand(msg.text);
    let reply: string;

    switch (cmd.action) {
      case "add":
        reply = await handleAdd(env, cmd, msg.from);
        break;
      case "remove":
        reply = await handleRemove(env, cmd, msg.from);
        break;
      case "list":
        reply = await handleList(env, msg.from);
        break;
      case "prices":
        reply = await handlePrices(env, msg.from);
        break;
      case "clear":
        reply = await handleClear(env, msg.from);
        break;
      case "help":
        reply = HELP_TEXT;
        break;
      default: {
        try {
          const history = await getRecentTurns(env, msg.from, AGENT_HISTORY_TURN_LIMIT);
          reply = await runAgent(env, msg.from, history, msg.text);
          await appendTurn(env, msg.from, "user", msg.text);
          await appendTurn(env, msg.from, "assistant", reply);
          await trimHistory(env, msg.from, AGENT_HISTORY_TURN_LIMIT);
        } catch {
          // Agent unavailable (e.g. Anthropic API/key issue) — fail soft instead of
          // dropping the reply entirely.
          reply = `Sorry, I didn't understand that.\n\n${HELP_TEXT}`;
        }
      }
    }

    await sendText(env, msg.from, reply);
  }

  // Always 200 quickly — Meta retries with backoff if it doesn't get one.
  return new Response("OK", { status: 200 });
}

export async function handleWebhookRequest(request: Request, env: Env): Promise<Response> {
  if (request.method === "GET") return handleVerification(request, env);
  if (request.method === "POST") return handleIncomingMessages(request, env);
  return new Response("Method Not Allowed", { status: 405 });
}
