import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { GameDatabase } from '../server/database';
import { createApp } from '../server/app';

test('hosted service serves the game and assets, keeps secrets private, verifies webhook secret', async () => {
  mkdirSync(resolve('work/hosting-tests'),{recursive:true});
  const root = mkdtempSync(resolve('work/hosting-tests/site-'));
  writeFileSync(resolve(root,'index.html'),'<h1>Monster Pet</h1>');
  mkdirSync(resolve(root,'assets')); writeFileSync(resolve(root,'assets/game.js'),'console.log("game")');
  writeFileSync(resolve(root,'.env'),'SECRET=hidden');
  const db = new GameDatabase(':memory:');
  const secret = 's'.repeat(48); let received = 0;
  const server = createApp(db,{production:true,origins:['https://monster.test'],staticDir:root,webhookSecret:secret,onTelegramUpdate:async () => {received++;}});
  await new Promise<void>(resolve => server.listen(0,'127.0.0.1',resolve));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('No port');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const page = await fetch(base); assert.equal(page.status,200); assert.ok(page.headers.get('content-type')?.includes('text/html')); assert.ok((await page.text()).includes('Monster Pet'));
    const asset = await fetch(`${base}/assets/game.js`); assert.equal(asset.status,200); assert.ok(asset.headers.get('cache-control')?.includes('immutable'));
    for (const path of ['/.env','/package.json','/server/index.ts','/%2eenv','/assets/%2e%2e%5c.env']) assert.equal((await fetch(base+path)).status,404);
    assert.equal((await fetch(base,{method:'HEAD'})).status,200);
    assert.equal((await fetch(`${base}/api/state`)).status,401);
    assert.equal((await fetch(`${base}/api/health`)).status,200);
    const hook = (key?:string) => fetch(`${base}/api/telegram/webhook`,{method:'POST',headers:{'content-type':'application/json',...(key?{'x-telegram-bot-api-secret-token':key}:{})},body:JSON.stringify({update_id:1})});
    assert.equal((await hook()).status,403); assert.equal((await hook('wrong')).status,403); assert.equal(received,0);
    assert.equal((await hook(secret)).status,200); assert.equal(received,1);
    assert.equal((await fetch(`${base}/api/auth/dev`,{method:'POST',headers:{origin:'https://monster.test','content-type':'application/json'},body:'{}'})).status,403);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); db.close(); }
});
