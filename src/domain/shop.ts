import type { Wallet } from './catchGame';
export const decorations = [
  { id: 'mint', name: 'Мятный ковёр', price: 10, color: 0x99c6a1 },
  { id: 'gold', name: 'Золотой ковёр', price: 20, color: 0xe1b76c },
  { id: 'night', name: 'Ночной ковёр', price: 30, color: 0x7b8cc4 },
];
export function buyDecoration(wallet: Wallet, id: string): Wallet {
  const item = decorations.find(item => item.id === id);
  if (!item || wallet.owned?.includes(id) || wallet.coins < item.price) return wallet;
  return { ...wallet, coins: wallet.coins - item.price, owned: [...(wallet.owned ?? []), id], equipped: id };
}
