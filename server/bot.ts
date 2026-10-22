import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { telegramConfig, botReply, type BotUpdate } from './telegram';

const controller = new AbortController();
process.on('SIGINT', () => controller.abort()); process.on('SIGTERM', () => controller.abort());
async function main(): Promise<void> {
  const config = telegramConfig(process.env);
  async function call<T>(method: string, payload: unknown = {}): Promise<T> {
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(40000)]);
    let response: Response;
    try { response = await fetch(`https://api.telegram.org/bot${config.token}/${method}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload), signal }); }
    catch { if (controller.signal.aborted) throw new Error('Остановлено'); throw new Error('Нет связи с Telegram API. Проверь подключение.'); }
    const body = await response.json() as { ok: boolean; result: T; error_code?: number };
    if (!body.ok) throw new Error(`Telegram отклонил ${method} (код ${body.error_code ?? response.status}). Проверь токен и настройки бота.`);
    return body.result;
  }
  const me = await call<{id: number; username: string}>('getMe');
  const hook = await call<{url: string}>('getWebhookInfo');
  if (hook.url) throw new Error('У бота уже настроен webhook. Этот процесс не будет его удалять: используй отдельного dev-бота или согласованно переключи способ получения сообщений.');
  await call('setChatMenuButton', { menu_button: { type:'web_app', text:'Играть', web_app:{url:config.appUrl} } });
  await call('setMyCommands', { commands:[{command:'start', description:'Познакомиться с монстриком'},{command:'play',description:'Открыть игру'},{command:'help',description:'Как играть'}] });
  const offsetPath = fileURLToPath(new URL(`../data/bot-${me.id}-offset.json`,import.meta.url));
  let offset = 0;
  try { const value = JSON.parse(await readFile(offsetPath,'utf8')); if (Number.isSafeInteger(value.offset) && value.offset >= 0) offset = value.offset; } catch { /* First launch has no checkpoint. */ }
  await mkdir(dirname(offsetPath),{recursive:true});
  console.log(`Бот @${me.username} готов. Открой https://t.me/${me.username} и отправь /start.`);
  console.log('Оставь этот процесс запущенным для ответов на команды. Токен в журнал не выводится.');
  while (!controller.signal.aborted) {
    try {
      const updates = await call<BotUpdate[]>('getUpdates', {offset,timeout:25,allowed_updates:['message']});
      for (const update of updates) {
        const reply = botReply(update,config.appUrl);
        if (reply) await call('sendMessage',reply);
        offset = update.update_id + 1;
        await writeFile(`${offsetPath}.tmp`,JSON.stringify({offset})); await rename(`${offsetPath}.tmp`,offsetPath);
      }
    } catch (error) {
      if (controller.signal.aborted) break;
      console.error(error instanceof Error ? error.message : 'Ошибка Telegram-бота');
      await new Promise<void>(resolve => {
        const finish = () => { clearTimeout(timer); controller.signal.removeEventListener('abort',finish); resolve(); };
        const timer = setTimeout(finish,5000); controller.signal.addEventListener('abort',finish,{once:true});
        if (controller.signal.aborted) finish();
      });
    }
  }
}
main().catch(error => { if (!controller.signal.aborted) { console.error(error instanceof Error ? error.message : 'Не удалось запустить бота'); process.exitCode = 1; } });
