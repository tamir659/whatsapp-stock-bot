import type { Env } from "../config";

export async function isAuthorized(env: Env, chatId: string): Promise<boolean> {
  const row = await env.DB.prepare(`SELECT 1 FROM authorized_chats WHERE chat_id = ?1`)
    .bind(chatId)
    .first();
  return row !== null;
}

export async function authorize(env: Env, chatId: string): Promise<void> {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO authorized_chats (chat_id, authorized_at) VALUES (?1, ?2)`
  )
    .bind(chatId, Date.now())
    .run();
}
