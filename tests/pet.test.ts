import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, initialPet, isPetState } from '../src/domain/pet';
test('actions clamp values and do not mutate prior state', () => {
  const original = { ...initialPet(), satiety: 95, energy: 5 };
  assert.equal(applyAction(original, 'feed').satiety, 100);
  assert.equal(applyAction(original, 'play').energy, 0);
  assert.equal(original.satiety, 95);
  assert.equal(applyAction({ ...original, energy: 90 }, 'rest').energy, 100);
});
test('invalid or incompatible stored data is rejected', () => {
  assert.equal(isPetState(initialPet()), true);
  for (const value of [null, {}, { ...initialPet(), energy: NaN }, { ...initialPet(), mood: 101 }, { ...initialPet(), version: 2 }]) assert.equal(isPetState(value), false);
});
