export interface TelegramConfig { token: string; appUrl: string }
export function telegramConfig(env: Record<string, string | undefined>): TelegramConfig {
  const token = env.BOT_TOKEN?.trim() ?? '';
  if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(token)) throw new Error('Создай бота в @BotFather и запиши BOT_TOKEN в .env.');
  let url: URL;
  try { url = new URL(env.APP_URL || env.APP_ORIGIN || ''); } catch { throw new Error('Добавь публичный HTTPS-адрес игры в APP_URL и его origin в APP_ORIGIN.'); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || host === 'localhost' || host === '::1' || host === '[::1]' || host.startsWith('127.') || host.endsWith('.example') || host.endsWith('.invalid') || host === 'example.com') throw new Error('Для Telegram нужен реальный публичный HTTPS-адрес игры; localhost не подходит.');
  const allowed = (env.APP_ORIGIN ?? '').split(',').map(value => value.trim());
  if (!allowed.includes(url.origin)) throw new Error('APP_ORIGIN должен включать origin публичного адреса игры, иначе backend отклонит вход.');
  return { token, appUrl: url.href };
}
export interface BotUpdate { update_id: number; message?: { text?: string; chat: { id: number; type: string } } }
export function botReply(update: BotUpdate, appUrl: string): Record<string, unknown> | null {
  const message = update.message;
  if (!message || !message.chat || !Number.isSafeInteger(message.chat.id) || message.chat.type !== 'private' || (message.text !== undefined && typeof message.text !== 'string')) return null;
  const command = message.text?.trim().split(/\s/)[0]?.split('@')[0]?.toLowerCase();
  if (!['/start','/play','/help'].includes(command ?? '')) return null;
  return {
    chat_id: message.chat.id,
    text: command === '/help' ? 'Нажми «Играть», чтобы открыть Monster Pet. Пройди тест, познакомься с вредным монстриком и подружись с ним! Команда /play снова откроет кнопку игры.' : 'Твой маленький вредина уже ждёт! 👾\nПройди короткий тест, получи монстрика и стань его человеком.',
    reply_markup: { inline_keyboard: [[{ text: '👾 Играть в Monster Pet', web_app: { url: appUrl } }]] },
  };
}
