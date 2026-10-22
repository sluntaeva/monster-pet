import { createHmac, timingSafeEqual } from 'node:crypto';

export function telegramUser(initData: string, botToken: string, now = Date.now()): string {
  const params = new URLSearchParams(initData);
  const keys = Array.from(params.keys());
  if (new Set(keys).size !== keys.length) throw new Error('Повторяющиеся поля авторизации');
  const hash = params.get('hash') ?? '';
  if (!/^[a-f0-9]{64}$/i.test(hash)) throw new Error('Некорректная подпись Telegram');
  params.delete('hash');
  const check = Array.from(params.entries()).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, value]) => `${key}=${value}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = createHmac('sha256', secret).update(check).digest();
  if (!timingSafeEqual(expected, Buffer.from(hash, 'hex'))) throw new Error('Недействительная подпись Telegram');
  const date = Number(params.get('auth_date'));
  if (!Number.isSafeInteger(date) || date * 1000 > now + 30_000 || now - date * 1000 > 3_600_000) throw new Error('Авторизация Telegram устарела');
  const user = JSON.parse(params.get('user') ?? 'null');
  if (!user || !Number.isSafeInteger(user.id) || user.id <= 0) throw new Error('Пользователь Telegram не найден');
  return `telegram:${user.id}`;
}
