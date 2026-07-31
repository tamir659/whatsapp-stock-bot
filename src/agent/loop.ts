import type { Env } from "../config";
import { AGENT_MAX_TOOL_ITERATIONS } from "../config";
import type { ConversationTurn } from "../db/conversation";
import { sendMessage } from "./anthropic-client";
import { buildSystemPrompt } from "./system-prompt";
import { runTool, TOOL_DEFINITIONS } from "./tools";
import type { AnthropicMessage, ContentBlock } from "./types";

function extractText(content: ContentBlock[]): string {
  return content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

export async function runAgent(
  env: Env,
  phoneNumber: string,
  history: ConversationTurn[],
  userMessage: string
): Promise<string> {
  const system = buildSystemPrompt();
  const messages: AnthropicMessage[] = [
    ...history.map((t): AnthropicMessage => ({ role: t.role, content: t.content })),
    { role: "user", content: userMessage },
  ];

  for (let i = 0; i < AGENT_MAX_TOOL_ITERATIONS; i++) {
    const response = await sendMessage(env, system, messages, TOOL_DEFINITIONS);

    if (response.stop_reason !== "tool_use") {
      const text = extractText(response.content);
      return text || "Sorry, I didn't have anything to say.";
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults: ContentBlock[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      const result = await runTool(env, phoneNumber, block.name, block.input);
      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
    }
    messages.push({ role: "user", content: toolResults });
  }

  return "Sorry, that took too many steps — try asking more simply.";
}
