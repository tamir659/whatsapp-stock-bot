import type { Env } from "./config";
import { getCronStatus } from "./db/status";

export async function handleStatusRequest(env: Env): Promise<Response> {
  const status = await getCronStatus(env);
  const body = status ?? { status: "never_run" };
  return new Response(JSON.stringify(body, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
}
