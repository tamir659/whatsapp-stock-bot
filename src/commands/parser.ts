import type { Condition } from "../db/watchlist";
import { resolveCryptoAlias } from "../stocks/crypto";

export type ParsedCommand =
  | { action: "add"; ticker: string; targetPrice: number; condition: Condition; nearPct: number | null }
  | { action: "remove"; ticker: string }
  | { action: "list" }
  | { action: "prices" }
  | { action: "clear" }
  | { action: "help" }
  | { action: "screener"; period: 150 | 20 }
  | { action: "rebound" }
  | { action: "unknown"; raw: string };

const ADD_WORDS = new Set(["add", "הוסף"]);
const REMOVE_WORDS = new Set(["remove", "הסר"]);
const LIST_WORDS = new Set(["list", "רשימה"]);
const PRICES_WORDS = new Set(["price", "prices", "מחיר", "מחירים"]);
const CLEAR_WORDS = new Set(["clear", "reset", "נקה", "אפס"]);
const HELP_WORDS = new Set(["help", "menu", "עזרה", "תפריט"]);
const SCREENER_150_WORDS = new Set(["screener", "ma150", "150", "סקרינר"]);
const SCREENER_20_WORDS = new Set(["twenty", "ma20", "20", "עשרים"]);
const REBOUND_WORDS = new Set(["rebound", "ath", "ריבאונד"]);
const ABOVE_WORDS = new Set(["above", "מעל"]);
const BELOW_WORDS = new Set(["below", "מתחת"]);
const NEAR_WORDS = new Set(["near", "קרוב"]);

function normalizeTicker(token: string | undefined): string | undefined {
  if (!token) return undefined;
  return resolveCryptoAlias(token.toUpperCase());
}

// "AAPL 220" (implicit above), "AAPL above 220", "AAPL below 220", "AAPL near 220 2%".
function parseAddAttempt(tickerToken: string | undefined, rest: string[], rawText: string): ParsedCommand {
  const ticker = normalizeTicker(tickerToken);
  if (!ticker) return { action: "unknown", raw: rawText };

  let condition: Condition = "above";
  let priceIdx = 0;
  const maybeConditionWord = rest[0];
  if (maybeConditionWord && ABOVE_WORDS.has(maybeConditionWord)) {
    condition = "above";
    priceIdx = 1;
  } else if (maybeConditionWord && BELOW_WORDS.has(maybeConditionWord)) {
    condition = "below";
    priceIdx = 1;
  } else if (maybeConditionWord && NEAR_WORDS.has(maybeConditionWord)) {
    condition = "near";
    priceIdx = 1;
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

export function parseCommand(rawText: string): ParsedCommand {
  // Telegram users habitually type slash-commands (e.g. "/list") out of platform habit —
  // strip a leading slash so that still works without registering bot commands with BotFather.
  const cleaned = rawText.trim().replace(/^\//, "");
  const tokens = cleaned.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { action: "unknown", raw: rawText };

  let [head, ...rest] = tokens;

  if (LIST_WORDS.has(head)) return { action: "list" };
  if (PRICES_WORDS.has(head)) return { action: "prices" };
  if (CLEAR_WORDS.has(head)) return { action: "clear" };
  if (HELP_WORDS.has(head)) return { action: "help" };
  if (SCREENER_150_WORDS.has(head)) return { action: "screener", period: 150 };
  if (SCREENER_20_WORDS.has(head)) return { action: "screener", period: 20 };
  if (REBOUND_WORDS.has(head)) return { action: "rebound" };

  if (REMOVE_WORDS.has(head)) {
    const ticker = normalizeTicker(rest[0]);
    if (!ticker) return { action: "unknown", raw: rawText };
    return { action: "remove", ticker };
  }

  // "add" is optional now — kept for backward compatibility, but you can just start
  // with the ticker directly: "AAPL above 220" works the same as "add AAPL above 220".
  if (ADD_WORDS.has(head)) {
    [head, ...rest] = rest;
  }

  return parseAddAttempt(head, rest, rawText);
}
