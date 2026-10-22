import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { initialFriendship, gainFriendship, friendshipLevel } from '../src/domain/friendship';
import { GameDatabase, hashToken } from '../server/database';
import { initialPet } from '../src/domain/pet';

test('friendship limits each event, caps daily XP and resets on the next day', () => {
  let progress = initialFriendship();
  for (let i = 0; i < 4; i++) {
    const result = gainFriendship(progress, 'game', '2026-10-21');
    assert.equal(result.xpGain, i < 3 ? 10 : 0); progress = result.friendship;
  }
  for (const event of ['feed','feed','feed','rest'] as const) progress = gainFriendship(progress, event, '2026-10-21').friendship;
  assert.equal(progress.xp, 50); assert.equal(progress.dailyXp, 50);
  assert.equal(gainFriendship(progress,'play','2026-10-21').xpGain,0);
  const tomorrow = gainFriendship(progress,'game','2026-10-22');
  assert.equal(tomorrow.friendship.xp,60); assert.equal(tomorrow.friendship.dailyXp,10);
});
test('level boundaries and max level are exact; XP does not exceed 500', () => {
  for (const [xp, level] of [[0,0],[49,0],[50,1],[149,1],[150,2],[300,3],[500,4]]) assert.equal(friendshipLevel(xp), level);
  const old = { ...initialFriendship(), xp: 495 };
  const result = gainFriendship(old,'game','2026-10-21');
  assert.equal(result.xpGain,5); assert.equal(result.levelUp,true);
  assert.equal(old.xp,495);
  assert.equal(gainFriendship(result.friendship,'game','2026-10-22').xpGain,0);
});
test('server awards only useful care and never duplicates XP on a replay', () => {
  const db = new GameDatabase(':memory:');
  try {
    db.login('friend', { pet: { ...initialPet(), satiety: 90 } });
    const body = { version: 0, requestId: randomUUID(), action:'feed' };
    const first = db.mutate('friend','/api/pet/actions',body);
    assert.equal(first.xpGain,5); assert.equal(first.state.friendship.xp,5);
    assert.equal(db.mutate('friend','/api/pet/actions',body).state.friendship.xp,5);
    const next = db.mutate('friend','/api/pet/actions',{...body, version:1, requestId:randomUUID()});
    assert.equal(next.xpGain,0); assert.equal(next.state.friendship.xp,5);
    assert.equal(next.state.pet?.satiety,100);
  } finally { db.close(); }
});
test('v1 database migrates without changing pet, money or session', () => {
  mkdirSync(resolve('work/backend-tests'),{recursive:true});
  const path = resolve('work/backend-tests',`${randomUUID()}-v1.sqlite`);
  const legacy = new DatabaseSync(path);
  legacy.exec('CREATE TABLE accounts(id TEXT PRIMARY KEY, pet TEXT, wallet TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 0); PRAGMA user_version=1;');
  legacy.prepare('INSERT INTO accounts VALUES(?,?,?,?)').run('old',JSON.stringify(initialPet('nyam')),JSON.stringify({coins:35,day:'',rewardedRuns:[],owned:['mint'],equipped:'mint'}),7);
  legacy.exec('CREATE TABLE sessions(token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES accounts(id), expires INTEGER NOT NULL);');
  legacy.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hashToken('previous-session'), 'old', Date.now() + 86400000);
  legacy.close();
  const db = new GameDatabase(path);
  try {
    const state = db.state('old');
    assert.equal(state.pet?.kind,'nyam'); assert.equal(state.wallet.coins,35); assert.equal(state.wallet.equipped,'mint');
    assert.equal(state.version,7); assert.equal(state.friendship.xp,0);
    assert.equal(db.user('previous-session'), 'old');
    const token = db.login('old'); assert.equal(db.user(token),'old');
  } finally { db.close(); }
});
