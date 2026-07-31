import type { Env } from "../config";

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

// Returns the most recent turns for a phone number, oldest first (ready to feed to the model).
export async function getRecentTurns(
  env: Env,
  phoneNumber: string,
  limit: number
): Promise<ConversationTurn[]> {
  const result = await env.DB.prepare(
    `SELECT role, content FROM conversation_history
     WHERE phone_number = ?1
     ORDER BY created_at DESC
     LIMIT ?2`
  )
    .bind(phoneNumber, limit)
    .all<ConversationTurn>();
  return (result.results ?? []).reverse();
}

export async function appendTurn(
  env: Env,
  phoneNumber: string,
  role: "user" | "assistant",
  content: string
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO conversation_history (phone_number, role, content, created_at)
     VALUES (?1, ?2, ?3, ?4)`
  )
    .bind(phoneNumber, role, content, Date.now())
    .run();
}

// Keeps the table from growing unbounded per user — call after appending.
export async function trimHistory(env: Env, phoneNumber: string, keep: number): Promise<void> {
  await env.DB.prepare(
    `DELETE FROM conversation_history
     WHERE phone_number = ?1
       AND id NOT IN (
         SELECT id FROM conversation_history
         WHERE phone_number = ?1
         ORDER BY created_at DESC
         LIMIT ?2
       )`
  )
    .bind(phoneNumber, keep)
    .run();
}
