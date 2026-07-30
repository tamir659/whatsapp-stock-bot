import type { Env } from "../config";

export interface CronStatus {
  last_run_at: number | null;
  status: string;
  message: string | null;
  tickers_checked: number | null;
  alerts_sent: number | null;
}

export async function recordCronRun(
  env: Env,
  status: "ok" | "error",
  message: string,
  tickersChecked: number,
  alertsSent: number
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO cron_status (id, last_run_at, status, message, tickers_checked, alerts_sent)
     VALUES (1, ?1, ?2, ?3, ?4, ?5)
     ON CONFLICT(id) DO UPDATE SET
       last_run_at = ?1, status = ?2, message = ?3, tickers_checked = ?4, alerts_sent = ?5`
  )
    .bind(Date.now(), status, message, tickersChecked, alertsSent)
    .run();
}

export async function getCronStatus(env: Env): Promise<CronStatus | null> {
  return env.DB.prepare(`SELECT * FROM cron_status WHERE id = 1`).first<CronStatus>();
}
