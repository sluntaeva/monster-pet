import { botReply, telegramConfig, type BotUpdate } from './telegram';
export function botWebhook(env: Record<string,string|undefined>) {
  const config = telegramConfig(env);
  return async (body: Record<string,unknown>): Promise<void> => {
    if (!Number.isSafeInteger(body.update_id)) return;
    const reply = botReply(body as unknown as BotUpdate,config.appUrl);
    if (!reply) return;
    let result: Response;
    try { result = await fetch(`https://api.telegram.org/bot${config.token}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(reply),signal:AbortSignal.timeout(10000)}); }
    catch { throw new Error('Telegram connection failed'); }
    const data = await result.json() as {ok?:boolean};
    if (!result.ok || !data.ok) throw new Error('Telegram message failed');
  };
}
export async function registerWebhook(env: Record<string,string|undefined>): Promise<void> {
  const config = telegramConfig(env);
  const secret = env.WEBHOOK_SECRET;
  if (!secret || !/^[A-Za-z0-9_-]{32,256}$/.test(secret)) throw new Error('WEBHOOK_SECRET must contain 32–256 letters, numbers, _ or -');
  const call = async (method: string, payload: unknown) => {
    let response: Response;
    try { response = await fetch(`https://api.telegram.org/bot${config.token}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)}); }
    catch { throw new Error(`Telegram ${method} connection failed`); }
    const result = await response.json() as {ok?: boolean};
    if (!response.ok || !result.ok) throw new Error(`Telegram ${method} failed (${response.status})`);
  };
  await call('setChatMenuButton',{menu_button:{type:'web_app',text:'Играть',web_app:{url:config.appUrl}}});
  await call('setMyCommands',{commands:[{command:'start',description:'Познакомиться с монстриком'},{command:'play',description:'Открыть игру'},{command:'help',description:'Как играть'}]});
  await call('setWebhook',{url:new URL('/api/telegram/webhook',config.appUrl).href,secret_token:secret,allowed_updates:['message'],drop_pending_updates:false});
}
