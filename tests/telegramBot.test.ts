import { test } from 'node:test';
import assert from 'node:assert/strict';
import { telegramConfig, botReply } from '../server/telegram';
const token = '123456:' + 'a'.repeat(32);
test('bot config requires a real HTTPS address and matching allowed origin', () => {
  assert.throws(() => telegramConfig({}),/BOT_TOKEN/);
  for (const appUrl of ['http://127.0.0.1:5173/','https://localhost/','https://your-real-domain.example/','https://example.com/']) assert.throws(() => telegramConfig({BOT_TOKEN:token,APP_URL:appUrl}));
  assert.throws(() => telegramConfig({BOT_TOKEN:token,APP_URL:'https://monster.test/app',APP_ORIGIN:'https://other.test'}),/APP_ORIGIN/);
  assert.equal(telegramConfig({BOT_TOKEN:token,APP_URL:'https://monster.test/app',APP_ORIGIN:'https://monster.test'}).appUrl,'https://monster.test/app');
});
test('bot responds only to player commands in private chats', () => {
  const make = (text: string, type = 'private') => ({update_id:1,message:{text,chat:{id:123,type}}});
  const reply = botReply(make('/start referral'),'https://monster.test/') as { chat_id: number; reply_markup: {inline_keyboard: {web_app:{url:string}}[][]} };
  assert.equal(reply.chat_id,123); assert.equal(reply.reply_markup.inline_keyboard[0][0].web_app.url,'https://monster.test/');
  assert.ok(botReply(make('/play@MonsterBot'),'https://monster.test/'));
  assert.equal(botReply(make('hello'),'https://monster.test/'),null);
  assert.equal(botReply(make('/start','group'),'https://monster.test/'),null);
});
