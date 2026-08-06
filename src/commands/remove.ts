import type { Env } from "../config";
import { removeRow, listRows } from "../db/watchlist";
import type { ParsedCommand } from "./parser";
import { formatWatchlist } from "./list";

export async function handleRemove(
  env: Env,
  cmd: Extract<ParsedCommand, { action: "remove" }>,
  from: string
): Promise<string> {
  const removed = await removeRow(env, cmd.ticker, from);
  if (!removed) {
    return `${cmd.ticker} wasn't on your watchlist.`;
  }

  const rows = await listRows(env, from);
  return `Removed ${cmd.ticker} from your watchlist.\n\n${formatWatchlist(rows)}`;
}
