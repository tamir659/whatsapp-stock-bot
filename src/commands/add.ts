import type { Env } from "../config";
import { addRow } from "../db/watchlist";
import type { ParsedCommand } from "./parser";

export async function handleAdd(
  env: Env,
  cmd: Extract<ParsedCommand, { action: "add" }>,
  from: string
): Promise<string> {
  await addRow(env, cmd.ticker, cmd.targetPrice, cmd.condition, cmd.nearPct, from);

  if (cmd.condition === "near") {
    return `Added ${cmd.ticker}: alert when price is within ${cmd.nearPct}% of ${cmd.targetPrice}.`;
  }
  return `Added ${cmd.ticker}: alert when price goes ${cmd.condition} ${cmd.targetPrice}.`;
}
