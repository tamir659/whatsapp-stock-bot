export interface TelegramUpdate {
  update_id: number;
  message?: {
    chat: { id: number };
    from?: { id: number };
    text?: string;
  };
}

export interface InboundMessage {
  from: string;
  text: string;
}

// Telegram POSTs one Update per webhook call (not batched like Meta's payload),
// but this still returns an array so webhook.ts's loop stays unchanged.
export function extractMessages(update: TelegramUpdate): InboundMessage[] {
  const chatId = update.message?.chat.id;
  const text = update.message?.text;
  if (chatId === undefined || !text) return [];
  return [{ from: String(chatId), text }];
}
