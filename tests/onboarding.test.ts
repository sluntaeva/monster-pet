import { test } from 'node:test';
import assert from 'node:assert/strict';
import { probabilities, drawPet, kinds } from '../src/domain/onboarding';
test('every answer combination keeps all four pets possible and weights sum to one', () => {
  for (let n = 0; n < 256; n++) {
    const answers = [n & 3, (n >> 2) & 3, (n >> 4) & 3, (n >> 6) & 3];
    const weights = probabilities(answers);
    assert.ok(Math.abs(weights.reduce((a,b) => a+b,0)-1) < 1e-12);
    weights.forEach(weight => assert.ok(weight >= .15 && weight <= .55));
    let cumulative = 0;
    weights.forEach((weight, i) => { assert.equal(drawPet(answers, cumulative + weight / 2), kinds[i]); cumulative += weight; });
  }
});
test('known distribution and interval boundaries', () => {
  assert.deepEqual(probabilities([0,0,1,2]), [.35,.25,.25,.15]);
  assert.equal(drawPet([0,1,2,3], 0), 'buba');
  assert.equal(drawPet([0,1,2,3], .25), 'zhuzha');
  assert.equal(drawPet([0,1,2,3], .5), 'plyukh');
  assert.equal(drawPet([0,1,2,3], .75), 'nyam');
  assert.throws(() => probabilities([]));
  assert.throws(() => probabilities([0,1,2,4]));
  assert.throws(() => drawPet([0,1,2,3], 1));
});
