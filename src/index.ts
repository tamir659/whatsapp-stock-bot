import type { Env } from "./config";
import { handleWebhookRequest } from "./webhook";
import { handleStatusRequest } from "./status";
import { checkPrices } from "./cron";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/status") {
      return handleStatusRequest(env);
    }
    return handleWebhookRequest(request, env);
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(checkPrices(env));
  },
};
