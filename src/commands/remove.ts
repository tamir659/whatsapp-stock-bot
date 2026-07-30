import type { Env } from "../config";
import { removeRow } from "../db/watchlist";
import type { ParsedCommand } from "./parser";

export async function handleRemove(
  env: Env,
  cmd: Extract<ParsedCommand, { action: "remove" }>,
  from: string
): Promise<string> {
  const removed = await removeRow(env, cmd.ticker, from);
  return removed
    ? `Removed ${cmd.ticker} from your watchlist.`
    : `${cmd.ticker} wasn't on your watchlist.`;
}
