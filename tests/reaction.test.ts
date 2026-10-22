import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialPet } from '../src/domain/pet';
import { touchReaction } from '../src/domain/reaction';
test('touch attacks below 30 on any stat, purrs at boundary and above', () => {
  assert.equal(touchReaction(initialPet()), 'purr');
  for (const key of ['satiety', 'mood', 'energy']) {
    assert.equal(touchReaction({ ...initialPet(), [key]: 29 }), 'attack');
    assert.equal(touchReaction({ ...initialPet(), [key]: 30 }), 'purr');
  }
});
