import { createServer, type IncomingMessage } from 'node:http';
import { ApiError, GameDatabase, hashToken } from './database';
import { telegramUser } from './auth';
import { timingSafeEqual } from 'node:crypto';
import { serveStatic } from './static';

interface Options { production?: boolean; devAuth?: boolean; botToken?: string; origins: string[]; staticDir?: string; webhookSecret?: string; onTelegramUpdate?: (body: Record<string,unknown>) => Promise<void> }
export function createApp(database: GameDatabase, options: Options) {
  if (options.production && options.devAuth) throw new Error('DEV_AUTH запрещён в production');
  const limits = new Map<string, { count: number; reset: number }>();
  const cookie = (req: IncomingMessage) => /(?:^|;\s*)mp_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie ?? '')?.[1] ?? '';
  return createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const send = (status: number, body: unknown) => { res.writeHead(status); res.end(JSON.stringify(body)); };
    try {
      const route = new URL(req.url ?? '/', 'http://localhost').pathname;
      if (options.staticDir && route !== '/api' && !route.startsWith('/api/')) { await serveStatic(req,res,options.staticDir); return; }
      if (route === '/api/health' && req.method === 'GET') { send(200, { ok: true }); return; }
      if (route === '/api/telegram/webhook') {
        if (req.method !== 'POST') throw new ApiError(405,'Method not allowed');
        const supplied = req.headers['x-telegram-bot-api-secret-token'];
        if (!options.webhookSecret || !options.onTelegramUpdate || typeof supplied !== 'string' || !timingSafeEqual(Buffer.from(hashToken(supplied)),Buffer.from(hashToken(options.webhookSecret)))) throw new ApiError(403,'Webhook forbidden');
        if (!req.headers['content-type']?.startsWith('application/json')) throw new ApiError(415,'JSON required');
        let size = 0; const chunks: Buffer[] = [];
        for await (const chunk of req) { size += chunk.length; if (size > 16384) throw new ApiError(413,'Request too large'); chunks.push(chunk); }
        let update: Record<string,unknown>;
        try { update = JSON.parse(Buffer.concat(chunks).toString()); } catch { throw new ApiError(400,'Invalid JSON'); }
        if (!update || typeof update !== 'object' || Array.isArray(update)) throw new ApiError(400,'Invalid update');
        await options.onTelegramUpdate(update); send(200,{ok:true}); return;
      }
      const origin = req.headers.origin;
      if (origin && !options.origins.includes(origin)) throw new ApiError(403, 'Источник запроса не разрешён');
      if (req.method === 'POST' && !origin) throw new ApiError(403, 'Заголовок Origin обязателен');
      if (req.method !== 'POST' && req.method !== 'GET') throw new ApiError(405, 'Метод не разрешён');
      const authenticated = database.user(cookie(req));
      const key = authenticated ? `user:${authenticated}` : req.socket.remoteAddress ?? 'unknown'; const now = Date.now();
      if (limits.size > 10000) for (const [ip, limit] of limits) if (limit.reset <= now) limits.delete(ip);
      let limit = limits.get(key);
      if (!limit || limit.reset <= now) { limit = { count: 0, reset: now + 60000 }; limits.set(key, limit); }
      if (++limit.count > 240) throw new ApiError(429, 'Слишком много запросов. Подожди минуту.');
      let body: Record<string, unknown> = {};
      if (req.method === 'POST') {
        if (!req.headers['content-type']?.startsWith('application/json')) throw new ApiError(415, 'Нужен JSON');
        let size = 0; const chunks: Buffer[] = [];
        for await (const chunk of req) { size += chunk.length; if (size > 16384) throw new ApiError(413, 'Слишком большой запрос'); chunks.push(chunk); }
        try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch { throw new ApiError(400, 'Некорректный JSON'); }
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ApiError(400, 'Нужен объект запроса');
      }
      if (req.method === 'POST' && (route === '/api/auth/dev' || route === '/api/auth/telegram')) {
        let token: string;
        if (route.endsWith('/dev')) {
          if (!options.devAuth || options.production) throw new ApiError(403, 'Локальный вход выключен');
          if (!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(key)) throw new ApiError(403, 'Локальный вход доступен только с этого компьютера');
          const existing = cookie(req);
          if (database.user(existing)) { send(200, { state: database.state(database.user(existing)!) }); return; }
          if (typeof body.deviceId !== 'string' || !/^[a-f0-9-]{36}$/i.test(body.deviceId)) throw new ApiError(400, 'Нет идентификатора локального профиля');
          token = database.login(`dev:${hashToken(body.deviceId)}`, { pet: body.pet, wallet: body.wallet });
        } else {
          if (!options.botToken) throw new ApiError(503, 'Токен Telegram-бота ещё не настроен');
          if (typeof body.initData !== 'string') throw new ApiError(400, 'Нет данных Telegram');
          let id: string;
          try { id = telegramUser(body.initData, options.botToken); } catch { throw new ApiError(401, 'Не удалось подтвердить вход через Telegram. Открой приложение заново.'); }
          token = database.login(id);
        }
        res.setHeader('Set-Cookie', `mp_session=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=604800${options.production ? '; Secure' : ''}`);
        send(200, { state: database.state(database.user(token)!) }); return;
      }
      const id = database.user(cookie(req));
      if (!id) throw new ApiError(401, 'Сессия закончилась. Обнови страницу.');
      if (req.method === 'GET' && route === '/api/state') { send(200, { state: database.state(id) }); return; }
      if (req.method === 'POST' && ['/api/onboarding','/api/pet/actions','/api/shop/buy','/api/shop/equip','/api/minigames/start','/api/minigames/finish'].includes(route)) {
        send(200, database.mutate(id, route, body)); return;
      }
      throw new ApiError(404, 'Маршрут не найден');
    } catch (error) {
      send(error instanceof ApiError ? error.status : 500, { error: error instanceof ApiError ? error.message : 'Ошибка сервера. Попробуй ещё раз.' });
      if (!(error instanceof ApiError)) console.error('Backend request failed:', error instanceof Error ? error.name : 'unknown');
    }
  });
}
