import type { Env } from "../config";
import { addRow } from "../db/watchlist";
import { getQuote } from "../stocks/finnhub";
import type { ParsedCommand } from "./parser";

export async function handleAdd(
  env: Env,
  cmd: Extract<ParsedCommand, { action: "add" }>,
  from: string
): Promise<string> {
  const quote = await getQuote(env, cmd.ticker);
  if (!quote) {
    return `${cmd.ticker} doesn't look like a valid ticker — double-check the symbol and try again.`;
  }

  await addRow(env, cmd.ticker, cmd.targetPrice, cmd.condition, cmd.nearPct, from);

  if (cmd.condition === "near") {
    return `Added ${cmd.ticker}: alert when price is within ${cmd.nearPct}% of ${cmd.targetPrice}.`;
  }
  return `Added ${cmd.ticker}: alert when price goes ${cmd.condition} ${cmd.targetPrice}.`;
}
