import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHmac } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { GameDatabase, ApiError } from '../server/database';
import { createApp } from '../server/app';
import { telegramUser } from '../server/auth';
import { initialPet } from '../src/domain/pet';

test('server issues a pet once, deduplicates actions and rejects stale writes', () => {
  const db = new GameDatabase(':memory:');
  try {
    db.login('alice');
    const mutate = (route: string, data = {}) => db.mutate('alice', route, { version: db.state('alice').version, requestId: randomUUID(), ...data });
    const first = mutate('/api/onboarding', { answers: [0,1,2,3] }).state.pet;
    assert.ok(first);
    assert.deepEqual(mutate('/api/onboarding', { answers: [3,3,3,3] }).state.pet, first);
    const body = { requestId: randomUUID(), version: db.state('alice').version, action: 'play' };
    const result = db.mutate('alice', '/api/pet/actions', body);
    assert.equal(result.state.pet?.energy, 60);
    assert.equal(db.mutate('alice', '/api/pet/actions', body).state.pet?.energy, 60);
    assert.throws(() => db.mutate('alice', '/api/pet/actions', { ...body, requestId: randomUUID() }), error => error instanceof ApiError && error.status === 409);
    assert.throws(() => db.mutate('alice', '/api/pet/actions', { ...body, action: 'feed' }), /уже использован/);
  } finally { db.close(); }
});

test('server checks run duration, ownership, score bounds, daily reward cap and purchases', () => {
  let clock = Date.UTC(2026,9,21,12);
  const db = new GameDatabase(':memory:', () => clock);
  try {
    db.login('alice', { pet: initialPet() }); db.login('bob', { pet: initialPet() });
    const mutate = (id: string, route: string, data = {}) => db.mutate(id, route, { version: db.state(id).version, requestId: randomUUID(), ...data });
    let lastRun = '';
    for (let i = 0; i < 4; i++) {
      const runId = mutate('alice', '/api/minigames/start').runId as string; lastRun = runId;
      assert.throws(() => mutate('alice', '/api/minigames/finish', { runId, score: 20 }), /длительность/);
      clock += 31000;
      assert.throws(() => mutate('bob', '/api/minigames/finish', { runId, score: 20 }), /не найден/);
      assert.throws(() => mutate('alice', '/api/minigames/finish', { runId, score: 100 }), /результат/);
      assert.equal(mutate('alice', '/api/minigames/finish', { runId, score: 20 }).reward, i < 3 ? 15 : 0);
    }
    assert.equal(db.state('alice').wallet.coins, 45);
    assert.equal(db.state('alice').friendship.xp, 30);
    assert.equal(mutate('alice', '/api/minigames/finish', { runId: lastRun, score: 20 }).reward, 0);
    assert.equal(db.state('alice').friendship.xp, 30);
    mutate('alice', '/api/shop/buy', { item: 'night' });
    assert.equal(db.state('alice').wallet.coins, 15);
    mutate('alice', '/api/shop/buy', { item: 'night' });
    assert.equal(db.state('alice').wallet.coins, 15);
    assert.throws(() => mutate('alice', '/api/shop/buy', { item: 'gold' }), /хватает/);
    assert.throws(() => mutate('alice', '/api/shop/equip', { item: 'gold' }), /не куплен/);
    mutate('alice', '/api/shop/equip', { item: null });
    assert.equal(db.state('alice').wallet.equipped, undefined);
    clock += 86400000;
    const next = mutate('alice', '/api/minigames/start').runId;
    clock += 31000;
    assert.equal(mutate('alice', '/api/minigames/finish', { runId: next, score: 1 }).reward, 5);
  } finally { db.close(); }
});

test('SQLite preserves progress and sessions after reopen; legacy import cannot overwrite an account', () => {
  mkdirSync(resolve('work/backend-tests'), { recursive: true });
  const path = resolve('work/backend-tests', `${randomUUID()}.sqlite`);
  let db = new GameDatabase(path);
  const token = db.login('alice', { pet: initialPet('nyam'), wallet: { coins: 25, day: '', rewardedRuns: [] } });
  db.mutate('alice', '/api/shop/buy', { requestId: randomUUID(), version: 0, item: 'mint' });
  db.close(); db = new GameDatabase(path);
  try {
    assert.equal(db.user(token), 'alice'); assert.equal(db.state('alice').wallet.coins, 15);
    assert.equal(db.state('alice').wallet.equipped, 'mint');
    db.login('alice', { pet: initialPet('buba') });
    assert.equal(db.state('alice').pet?.kind, 'nyam');
  } finally { db.close(); }
});

test('Telegram signature, expiry and tampering are checked', () => {
  const now = Date.now(); const token = 'test-bot-token';
  const params = new URLSearchParams({ auth_date: String(Math.floor(now / 1000)), user: JSON.stringify({id:12345}), query_id:'test' });
  const check = Array.from(params.entries()).sort().map(([k,v]) => `${k}=${v}`).join('\n');
  const key = createHmac('sha256','WebAppData').update(token).digest();
  params.set('hash', createHmac('sha256',key).update(check).digest('hex'));
  assert.equal(telegramUser(params.toString(),token,now), 'telegram:12345');
  assert.throws(() => telegramUser(params.toString(),token,now+7200000), /устарела/);
  params.set('user', JSON.stringify({id:999})); assert.throws(() => telegramUser(params.toString(),token,now), /подпись/);
});

test('HTTP requires a session, allowed Origin and JSON; production refuses dev login', async () => {
  const db = new GameDatabase(':memory:');
  assert.throws(() => createApp(db, { production:true, devAuth:true, origins:[] }), /DEV_AUTH/);
  const origin = 'http://127.0.0.1:5173';
  const server = createApp(db, { devAuth:true, origins:[origin] });
  await new Promise<void>(resolve => server.listen(0,'127.0.0.1',resolve));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('No port');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    assert.equal((await fetch(`${base}/api/state`)).status,401);
    const login = (headers: Record<string,string>) => fetch(`${base}/api/auth/dev`, { method:'POST',headers,body:JSON.stringify({deviceId:randomUUID()}) });
    assert.equal((await login({'content-type':'application/json'})).status,403);
    assert.equal((await login({'content-type':'application/json',origin:'https://other.invalid'})).status,403);
    assert.equal((await login({origin})).status,415);
    const logged = await login({'content-type':'application/json',origin});
    assert.equal(logged.status,200);
    const setCookie = logged.headers.get('set-cookie')!; assert.ok(setCookie.includes('HttpOnly'));
    const cookie = setCookie.split(';')[0];
    assert.equal((await fetch(`${base}/api/state`, {headers:{cookie}})).status,200);
    assert.equal((await fetch(`${base}/api/auth/telegram`,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({initData:'x'})})).status,503);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); db.close(); }
});
