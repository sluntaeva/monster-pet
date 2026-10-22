import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buyDecoration } from '../src/domain/shop';
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
