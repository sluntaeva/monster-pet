import { test } from 'node:test';
import assert from 'node:assert/strict';
import { awardRun, emptyWallet, readWallet } from '../src/domain/catchGame';
test('reward thresholds, duplicate protection, daily cap and reset', () => {
  let wallet = emptyWallet();
  assert.equal(awardRun(wallet, 'zero', 0, '2026-10-21').reward, 0);
  for (const [id, score, expected] of [['a', 7, 5], ['b', 8, 10], ['c', 15, 15]] as const) {
    const result = awardRun(wallet, id, score, '2026-10-21');
    assert.equal(result.reward, expected); wallet = result.wallet;
  }
  assert.equal(wallet.coins, 30);
  assert.equal(awardRun(wallet, 'c', 20, '2026-10-21').reward, 0);
  assert.equal(awardRun(wallet, 'd', 20, '2026-10-21').reward, 0);
  assert.equal(awardRun(wallet, 'e', 20, '2026-10-22').wallet.coins, 45);
});
test('corrupt local wallet is rejected', () => {
  for (const value of [null, {}, { coins: -1, day: '', rewardedRuns: [] }]) assert.deepEqual(readWallet(value), emptyWallet());
});
