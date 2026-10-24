import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { applyAbsence } from '../src/domain/absence';
import { initialPet } from '../src/domain/pet';
import { GameDatabase, ApiError } from '../server/database';

const hour = 3_600_000;

test('absence caps at twelve hours, preserves partial hours and clamps scales', () => {
  const pet = initialPet();
  const result = applyAbsence(pet, 0, 100.5 * hour);
  assert.deepEqual(result.pet, { ...pet, satiety: 46, mood: 58, energy: 94 });
  assert.equal(result.updatedAt, 100 * hour);
  assert.deepEqual(pet, initialPet());
  assert.deepEqual(applyAbsence(pet, hour, 0).pet, pet);
  assert.deepEqual(applyAbsence({ ...pet, satiety: 1, mood: 1, energy: 99 }, 0, 12 * hour).pet,
    { ...pet, satiety: 0, mood: 0, energy: 100 });
});

test('server persists elapsed time, rejects stale versions and does not repeat absence or actions', () => {
  let now = Date.UTC(2026, 9, 24);
  const db = new GameDatabase(':memory:', () => now);
  try {
    db.login('pet', { pet: initialPet() });
    now += 1.5 * hour;
    const state = db.state('pet');
    assert.equal(state.pet?.satiety, 68);
    assert.equal(state.version, 1);
    db.login('pet');
    assert.deepEqual(db.state('pet'), state);
    assert.throws(() => db.mutate('pet', '/api/pet/actions', {
      requestId: randomUUID(), version: 0, action: 'feed',
    }), error => error instanceof ApiError && error.status === 409);
    now += .5 * hour;
    const body = { requestId: randomUUID(), version: 1, action: 'feed' };
    const result = db.mutate('pet', '/api/pet/actions', body);
    assert.equal(result.state.pet?.satiety, 86);
    assert.equal(result.state.pet?.energy, 74);
    assert.deepEqual(db.mutate('pet', '/api/pet/actions', body), result);
    now += 100 * hour;
    assert.equal(db.state('pet').pet?.satiety, 62);
    assert.equal(db.state('pet').pet?.satiety, 62);
  } finally { db.close(); }
});
