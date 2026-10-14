export interface Env {
  DB: D1Database;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
  BOT_PASSWORD: string;
  OWNER_CHAT_ID: string;
  FINNHUB_KEY: string;
  ANTHROPIC_API_KEY: string;
  SCREENER_SECRET: string;
  SCREENER_GITHUB_TOKEN: string;
}

export const AGENT_MODEL = "claude-sonnet-5";
export const AGENT_MAX_TOOL_ITERATIONS = 5;
export const AGENT_HISTORY_TURN_LIMIT = 20;
