export interface Env {
  DB: D1Database;
  WHATSAPP_TOKEN: string;
  WHATSAPP_PHONE_ID: string;
  WHATSAPP_VERIFY_TOKEN: string;
  WHATSAPP_APP_SECRET: string;
  FINNHUB_KEY: string;
  ANTHROPIC_API_KEY: string;
  SCREENER_SECRET: string;
  SCREENER_GITHUB_TOKEN: string;
}

export const AGENT_MODEL = "claude-sonnet-5";
export const AGENT_MAX_TOOL_ITERATIONS = 5;
export const AGENT_HISTORY_TURN_LIMIT = 20;
