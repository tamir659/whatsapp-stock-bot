import type { Env } from "./config";
import { handleWebhookRequest } from "./webhook";
import { handleStatusRequest } from "./status";
import { handleScreenerAlert } from "./screener";
import { checkPrices } from "./cron";
import { isBriefingTime, sendMorningBriefing } from "./morningBriefing";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/status") {
      return handleStatusRequest(env);
    }
    if (url.pathname === "/screener-alert" && request.method === "POST") {
      return handleScreenerAlert(request, env);
    }
    return handleWebhookRequest(request, env);
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(checkPrices(env));
    if (isBriefingTime()) {
      ctx.waitUntil(sendMorningBriefing(env));
    }
  },
};
