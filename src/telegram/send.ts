import type { Env } from "../config";

async function callTelegramApi(env: Env, method: string, body: unknown): Promise<void> {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Telegram send failed (${res.status}): ${errText}`);
  }
}

export async function sendMessage(env: Env, chatId: string, text: string): Promise<void> {
  await callTelegramApi(env, "sendMessage", { chat_id: chatId, text });
}

// Proactive alert. Unlike WhatsApp, Telegram has no template-approval system or
// 24h-session window — any chat that has ever messaged the bot can be messaged back
// at any time, so this is just a formatted sendMessage.
export async function sendPriceAlert(
  env: Env,
  chatId: string,
  params: { ticker: string; currentPrice: string; targetPrice: string; condition: string }
): Promise<void> {
  const text = `📈 Price alert: ${params.ticker} is now ${params.currentPrice} (target: ${params.targetPrice}, condition: ${params.condition}).`;
  await sendMessage(env, chatId, text);
}
