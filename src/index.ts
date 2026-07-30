import type { Env } from "./config";
import { handleWebhookRequest } from "./webhook";
import { checkPrices } from "./cron";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleWebhookRequest(request, env);
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(checkPrices(env));
  },
};
