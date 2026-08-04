import type { Env } from "../config";

const GRAPH_VERSION = "v21.0";

async function callGraphApi(env: Env, body: unknown): Promise<void> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${env.WHATSAPP_PHONE_ID}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`WhatsApp send failed (${res.status}): ${errText}`);
  }
}

// Free-form reply. Only deliverable within the 24h window opened by the user's last message.
export async function sendText(env: Env, to: string, body: string): Promise<void> {
  await callGraphApi(env, {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body },
  });
}

// Business-initiated alert. Requires the "price_target_alert" utility template
// to be approved in Meta's WhatsApp Manager before this will succeed.
export async function sendPriceAlertTemplate(
  env: Env,
  to: string,
  params: { ticker: string; currentPrice: string; targetPrice: string; condition: string }
): Promise<void> {
  await callGraphApi(env, {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: "price_target_alert",
      language: { code: "en" }, // matches the language Meta actually approved the template under
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: params.ticker },
            { type: "text", text: params.currentPrice },
            { type: "text", text: params.targetPrice },
            { type: "text", text: params.condition },
          ],
        },
      ],
    },
  });
}

// Business-initiated MA150 screener alert (from the separate `ma150-screener` project).
// Requires the "ma150_screener_alert" utility template to be approved in Meta's WhatsApp
// Manager first — not yet created as of 2026-08-04. The template has a single {{1}} body
// parameter: WhatsApp template parameters cannot contain newline characters, so the summary
// must stay on one line (comma-separated "TICKER +X.X%" entries), not one stock per line.
export async function sendScreenerAlert(env: Env, to: string, summary: string): Promise<void> {
  await callGraphApi(env, {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: "ma150_screener_alert",
      language: { code: "en" },
      components: [
        {
          type: "body",
          parameters: [{ type: "text", text: summary }],
        },
      ],
    },
  });
}
