import type { Env } from "../config";
import { addRow, listRows, removeRow, clearRows, type Condition } from "../db/watchlist";
import { getQuotes } from "../stocks/finnhub";
import { isKnownTicker } from "../db/tickers";
import { handlePrices } from "../commands/prices";
import type { ToolDefinition } from "./types";

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "add_stock",
    description:
      "Add a US stock (NASDAQ/NYSE) to the user's personal watchlist with a target price. Triggers a WhatsApp alert later when the price crosses the target, then that entry is removed automatically. The same ticker can be added more than once with different targets/conditions — that's allowed, not a duplicate error.",
    input_schema: {
      type: "object",
      properties: {
        ticker: { type: "string", description: "Stock ticker, e.g. AAPL" },
        target_price: { type: "number", description: "Target price to watch for" },
        condition: {
          type: "string",
          enum: ["above", "below", "near"],
          description: "Alert when price goes above, below, or near the target. Defaults to 'above'.",
        },
        near_pct: {
          type: "number",
          description: "Only used when condition is 'near' — percent band around the target. Defaults to 1.",
        },
      },
      required: ["ticker", "target_price"],
    },
  },
  {
    name: "remove_stock",
    description: "Remove a stock from the user's personal watchlist. Removes every entry for that ticker if there are duplicates with different targets.",
    input_schema: {
      type: "object",
      properties: {
        ticker: { type: "string", description: "Stock ticker to remove, e.g. AAPL" },
      },
      required: ["ticker"],
    },
  },
  {
    name: "list_stocks",
    description: "List everything currently on the user's personal watchlist.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_price",
    description: "Get the current live price of a US stock (not necessarily on the watchlist).",
    input_schema: {
      type: "object",
      properties: {
        ticker: { type: "string", description: "Stock ticker, e.g. AAPL" },
      },
      required: ["ticker"],
    },
  },
  {
    name: "get_watchlist_prices",
    description:
      "Get the current live price of every stock on the user's watchlist, alongside its target. Use this for things like 'how are my stocks doing?'",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "clear_watchlist",
    description: "Remove everything from the user's personal watchlist at once.",
    input_schema: { type: "object", properties: {} },
  },
];

export async function runTool(
  env: Env,
  phoneNumber: string,
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "add_stock": {
      const ticker = String(input.ticker).toUpperCase();
      const known = await isKnownTicker(env, ticker);
      if (!known) {
        return `${ticker} doesn't look like a real ticker — double-check the symbol.`;
      }
      const targetPrice = Number(input.target_price);
      const condition = (input.condition as Condition | undefined) ?? "above";
      const nearPct = condition === "near" ? Number(input.near_pct ?? 1) : null;
      await addRow(env, ticker, targetPrice, condition, nearPct, phoneNumber);
      return `Added ${ticker}: alert when price goes ${condition} ${targetPrice}.`;
    }
    case "remove_stock": {
      const ticker = String(input.ticker).toUpperCase();
      const removed = await removeRow(env, ticker, phoneNumber);
      return removed ? `Removed ${ticker}.` : `${ticker} wasn't on the watchlist.`;
    }
    case "list_stocks": {
      const rows = await listRows(env, phoneNumber);
      if (rows.length === 0) return "The watchlist is empty.";
      return rows
        .map((r) =>
          r.condition === "near"
            ? `${r.ticker}: within ${r.near_pct}% of ${r.target_price}`
            : `${r.ticker}: ${r.condition} ${r.target_price}`
        )
        .join("\n");
    }
    case "get_price": {
      const ticker = String(input.ticker).toUpperCase();
      const [quote] = await getQuotes(env, [ticker]);
      return quote ? `${ticker} is currently at ${quote.price}.` : `Couldn't get a price for ${ticker}.`;
    }
    case "get_watchlist_prices":
      return handlePrices(env, phoneNumber);
    case "clear_watchlist": {
      const count = await clearRows(env, phoneNumber);
      return count > 0 ? `Cleared ${count} stock(s) from the watchlist.` : "The watchlist was already empty.";
    }
    default:
      return `Unknown tool: ${name}`;
  }
}
