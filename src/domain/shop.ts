import type { Wallet } from './catchGame';
import { decorations, type DecorationSlot } from './catalog';
export { decorations } from './catalog';
export function equipDecoration(wallet: Wallet, id: string | null, slot: DecorationSlot = 'rug'): Wallet {
  const item = decorations.find(item => item.id === id);
  if (id !== null && (!item || !wallet.owned?.includes(id))) return wallet;
  const target = item?.slot ?? slot;
  if (target === 'rug') return { ...wallet, equipped: id ?? undefined };
  const room = { ...wallet.room };
  if (id === null) delete room[target]; else room[target] = id;
  return { ...wallet, room };
}
export function buyDecoration(wallet: Wallet, id: string): Wallet {
  const item = decorations.find(item => item.id === id);
  if (!item || wallet.owned?.includes(id) || wallet.coins < item.price) return wallet;
  return equipDecoration({ ...wallet, coins: wallet.coins - item.price, owned: [...(wallet.owned ?? []), id] }, id);
}
