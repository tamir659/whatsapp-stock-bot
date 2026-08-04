import type { Condition } from "../db/watchlist";

export type ParsedCommand =
  | { action: "add"; ticker: string; targetPrice: number; condition: Condition; nearPct: number | null }
  | { action: "remove"; ticker: string }
  | { action: "list" }
  | { action: "prices" }
  | { action: "clear" }
  | { action: "help" }
  | { action: "screener" }
  | { action: "unknown"; raw: string };

const ADD_WORDS = new Set(["add", "הוסף"]);
const REMOVE_WORDS = new Set(["remove", "הסר"]);
const LIST_WORDS = new Set(["list", "רשימה"]);
const PRICES_WORDS = new Set(["price", "prices", "מחיר", "מחירים"]);
const CLEAR_WORDS = new Set(["clear", "reset", "נקה", "אפס"]);
const HELP_WORDS = new Set(["help", "עזרה"]);
const SCREENER_WORDS = new Set(["screener", "ma150", "150", "סקרינר"]);
const ABOVE_WORDS = new Set(["above", "מעל"]);
const BELOW_WORDS = new Set(["below", "מתחת"]);
const NEAR_WORDS = new Set(["near", "קרוב"]);

export function parseCommand(rawText: string): ParsedCommand {
  const tokens = rawText.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { action: "unknown", raw: rawText };

  const [head, ...rest] = tokens;

  if (LIST_WORDS.has(head)) return { action: "list" };
  if (PRICES_WORDS.has(head)) return { action: "prices" };
  if (CLEAR_WORDS.has(head)) return { action: "clear" };
  if (HELP_WORDS.has(head)) return { action: "help" };
  if (SCREENER_WORDS.has(head)) return { action: "screener" };

  if (REMOVE_WORDS.has(head)) {
    const ticker = rest[0]?.toUpperCase();
    if (!ticker) return { action: "unknown", raw: rawText };
    return { action: "remove", ticker };
  }

  if (ADD_WORDS.has(head)) {
    const ticker = rest[0]?.toUpperCase();
    if (!ticker) return { action: "unknown", raw: rawText };

    // "add AAPL 220" (implicit above), "add AAPL above 220", "add AAPL below 220",
    // "add AAPL near 220 2%"
    let condition: Condition = "above";
    let priceIdx = 1;
    const maybeConditionWord = rest[1];
    if (maybeConditionWord && ABOVE_WORDS.has(maybeConditionWord)) {
      condition = "above";
      priceIdx = 2;
    } else if (maybeConditionWord && BELOW_WORDS.has(maybeConditionWord)) {
      condition = "below";
      priceIdx = 2;
    } else if (maybeConditionWord && NEAR_WORDS.has(maybeConditionWord)) {
      condition = "near";
      priceIdx = 2;
    }

    const priceToken = rest[priceIdx];
    const targetPrice = priceToken ? Number(priceToken) : NaN;
    if (!Number.isFinite(targetPrice)) return { action: "unknown", raw: rawText };

    let nearPct: number | null = null;
    if (condition === "near") {
      const pctToken = rest[priceIdx + 1];
      const parsedPct = pctToken ? Number(pctToken.replace("%", "")) : NaN;
      nearPct = Number.isFinite(parsedPct) ? parsedPct : 1; // default 1% band
    }

    return { action: "add", ticker, targetPrice, condition, nearPct };
  }

  return { action: "unknown", raw: rawText };
}
