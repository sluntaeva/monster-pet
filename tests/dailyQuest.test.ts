import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { GameDatabase, ApiError } from '../server/database';
import { initialPet, type PetAction } from '../src/domain/pet';

test('daily care rewards three distinct actions once, survives restart and resets at UTC midnight', () => {
  let now = Date.UTC(2026, 9, 24, 23, 59);
  mkdirSync(resolve('work/backend-tests'), { recursive: true });
  const path = resolve('work/backend-tests', `${randomUUID()}-daily.sqlite`);
  let db = new GameDatabase(path, () => now);
  try {
    db.login('alice', { pet: { ...initialPet(), satiety: 100, mood: 100, energy: 100 } });
    db.login('bob', { pet: initialPet() });
    const act = (action: PetAction) => db.mutate('alice', '/api/pet/actions', {
      requestId: randomUUID(), version: db.state('alice').version, action,
    });
    assert.equal(act('feed').dailyReward, 0);
    act('feed');
    assert.deepEqual(db.state('alice').dailyQuest.actions, ['feed']);
    act('play');
    db.close(); db = new GameDatabase(path, () => now);
    assert.equal(db.state('alice').dailyQuest.actions.length, 2);
    const body = { requestId: randomUUID(), version: db.state('alice').version, action: 'rest' };
    assert.equal(db.mutate('alice', '/api/pet/actions', body).dailyReward, 10);
    assert.equal(db.state('alice').wallet.coins, 10);
    db.mutate('alice', '/api/pet/actions', body);
    assert.equal(db.state('alice').wallet.coins, 10);
    assert.throws(() => db.mutate('alice', '/api/pet/actions', { ...body, requestId: randomUUID() }),
      error => error instanceof ApiError && error.status === 409);
    assert.equal(act('rest').dailyReward, 0);
    assert.equal(db.state('bob').wallet.coins, 0);
    assert.deepEqual(db.state('bob').dailyQuest.actions, []);
    now += 60_000;
    assert.deepEqual(db.state('alice').dailyQuest.actions, []);
    assert.equal(db.state('alice').dailyQuest.rewarded, false);
    act('play'); act('rest');
    assert.equal(act('feed').dailyReward, 10);
    assert.equal(db.state('alice').wallet.coins, 20);
    assert.equal(db.state('alice').wallet.rewardedRuns.length, 0);
    db.close(); db = new GameDatabase(path, () => now);
    assert.equal(act('feed').dailyReward, 0);
    assert.equal(db.state('alice').wallet.coins, 20);
  } finally { db.close(); }
});
