import type { Env } from "../config";
import { clearRows } from "../db/watchlist";

export async function handleClear(env: Env, from: string): Promise<string> {
  const count = await clearRows(env, from);
  return count > 0
    ? `Cleared ${count} stock${count === 1 ? "" : "s"} from your watchlist.`
    : "Your watchlist was already empty.";
}
