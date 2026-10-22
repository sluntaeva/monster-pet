import { fileURLToPath } from 'node:url';
import { GameDatabase } from './database';
import { createApp } from './app';
import { botWebhook, registerWebhook } from './webhook';

const production = process.env.NODE_ENV === 'production';
const publicUrl = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL;
const origin = process.env.APP_ORIGIN || (publicUrl ? new URL(publicUrl).origin : undefined);
const environment = { ...process.env, APP_URL: publicUrl, APP_ORIGIN: origin };
if (production && !process.env.BOT_TOKEN) throw new Error('BOT_TOKEN обязателен в production');
if (production && !origin?.startsWith('https://')) throw new Error('APP_ORIGIN должен быть HTTPS в production');
const webhookEnabled = process.env.ENABLE_BOT_WEBHOOK === '1';
if (webhookEnabled && (!process.env.WEBHOOK_SECRET || !/^[A-Za-z0-9_-]{32,256}$/.test(process.env.WEBHOOK_SECRET))) throw new Error('Valid WEBHOOK_SECRET required');
const database = new GameDatabase(process.env.DATABASE_PATH ?? fileURLToPath(new URL('../data/monster-pet.sqlite', import.meta.url)));
const server = createApp(database, { production, devAuth: process.env.DEV_AUTH === '1', botToken: process.env.BOT_TOKEN, origins: (origin ?? 'http://127.0.0.1:5173,http://localhost:5173').split(','), staticDir: production ? fileURLToPath(new URL('../dist',import.meta.url)) : undefined, webhookSecret: process.env.WEBHOOK_SECRET, onTelegramUpdate: webhookEnabled ? botWebhook(environment) : undefined });
const port = Number(process.env.PORT || process.env.API_PORT || 3001);
server.listen(port, process.env.HOST || (production ? '0.0.0.0' : '127.0.0.1'), () => {
  console.log(`Monster Pet listening on port ${port}`);
  if (webhookEnabled) void registerWebhook(environment).then(() => console.log('Telegram menu and webhook configured')).catch(() => console.error('Telegram setup failed: check bot token, public URL and WEBHOOK_SECRET.'));
});
function shutdown(): void { server.close(() => { database.close(); process.exit(0); }); server.closeIdleConnections(); }
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
