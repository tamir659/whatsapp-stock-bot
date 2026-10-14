// Telegram attaches the secret_token you gave it in setWebhook as the
// "X-Telegram-Bot-Api-Secret-Token" header on every webhook call. Without checking
// this, anyone who finds the webhook URL could POST forged messages.
export function verifySecret(headerValue: string | null, expected: string): boolean {
  if (!headerValue) return false;
  return timingSafeEqual(headerValue, expected);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}
