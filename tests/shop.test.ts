import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buyDecoration, equipDecoration } from '../src/domain/shop';
import { GameDatabase } from '../server/database';
import { randomUUID } from 'node:crypto';
import { initialPet } from '../src/domain/pet';
import { awardRun, emptyWallet, readWallet } from '../src/domain/catchGame';
test('purchase deducts once, equips item, rejects insufficient balance and unknown goods', () => {
  const initial = { ...emptyWallet(), coins: 15 };
  const bought = buyDecoration(initial, 'mint');
  assert.equal(bought.coins, 5); assert.equal(bought.equipped, 'mint');
  assert.equal(initial.coins, 15);
  assert.equal(buyDecoration(bought, 'mint'), bought);
  assert.equal(buyDecoration(bought, 'night'), bought);
  assert.equal(buyDecoration(bought, 'fake'), bought);
  assert.deepEqual(readWallet(JSON.parse(JSON.stringify(bought))), bought);
  assert.deepEqual(awardRun(bought, 'run', 10, '2026-10-21').wallet.owned, ['mint']);
});

test('room slots coexist, validate ownership and survive wallet serialization', () => {
  let wallet = buyDecoration({ ...emptyWallet(), coins: 200 }, 'rose');
  for (const item of ['cactus', 'stars', 'ball']) wallet = buyDecoration(wallet, item);
  assert.equal(wallet.equipped, 'rose');
  assert.deepEqual(wallet.room, { plant: 'cactus', wall: 'stars', toy: 'ball' });
  assert.equal(wallet.coins, 140);
  assert.deepEqual(readWallet(JSON.parse(JSON.stringify(wallet))), wallet);
  assert.equal(equipDecoration(wallet, 'flowers'), wallet);
  const changed = buyDecoration(wallet, 'flowers');
  assert.equal(changed.room?.plant, 'flowers');
  assert.equal(changed.room?.wall, 'stars');
  assert.equal(equipDecoration(changed, null, 'plant').room?.plant, undefined);
  assert.equal(equipDecoration(changed, null).equipped, undefined);
  const corrupt = readWallet({ ...changed, equipped: 'flowers', room: { plant: 'moon', wall: 'cactus', toy: 'cushion' } });
  assert.equal(corrupt.equipped, undefined);
  assert.equal(corrupt.room, undefined);
});

test('server buys each decoration once and removes only the requested room slot', () => {
  const db = new GameDatabase(':memory:');
  try {
    db.login('shopper', { pet: initialPet(), wallet: { ...emptyWallet(), coins: 100 } });
    const mutate = (route: string, data: Record<string, unknown>) => db.mutate('shopper', route, { requestId: randomUUID(), version: db.state('shopper').version, ...data });
    mutate('/api/shop/buy', { item: 'rose' });
    const body = { requestId: randomUUID(), version: db.state('shopper').version, item: 'cactus' };
    db.mutate('shopper', '/api/shop/buy', body); db.mutate('shopper', '/api/shop/buy', body);
    mutate('/api/shop/buy', { item: 'cactus' });
    mutate('/api/shop/buy', { item: 'moon' });
    assert.equal(db.state('shopper').wallet.coins, 35);
    assert.equal(db.state('shopper').wallet.equipped, 'rose');
    assert.deepEqual(db.state('shopper').wallet.room, { plant: 'cactus', wall: 'moon' });
    assert.throws(() => mutate('/api/shop/equip', { item: 'ball' }), /не куплен/);
    assert.throws(() => mutate('/api/shop/equip', { item: null, slot: 'fake' }), /Неизвестное/);
    mutate('/api/shop/equip', { item: null, slot: 'plant' });
    assert.deepEqual(db.state('shopper').wallet.room, { wall: 'moon' });
    assert.equal(db.state('shopper').wallet.equipped, 'rose');
  } finally { db.close(); }
});
