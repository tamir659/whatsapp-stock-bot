import type { Env } from "../config";
import { AGENT_MODEL } from "../config";
import type { AnthropicMessage, AnthropicResponse, ToolDefinition } from "./types";

const API_URL = "https://api.anthropic.com/v1/messages";
const MAX_RETRIES = 2;

export async function sendMessage(
  env: Env,
  system: string,
  messages: AnthropicMessage[],
  tools: ToolDefinition[]
): Promise<AnthropicResponse> {
  const body = JSON.stringify({
    model: AGENT_MODEL,
    max_tokens: 1024,
    system,
    messages,
    tools,
  });

  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body,
    });

    if (res.ok) {
      return (await res.json()) as AnthropicResponse;
    }

    if (res.status === 429 || res.status >= 500) {
      lastError = new Error(`Anthropic API ${res.status}: ${await res.text()}`);
      continue;
    }

    throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  }

  throw lastError ?? new Error("Anthropic API request failed after retries");
}
