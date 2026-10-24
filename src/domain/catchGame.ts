export const ROUND_SECONDS = 30;
import { decorations } from './catalog';
export interface Wallet { coins: number; day: string; rewardedRuns: string[]; owned?: string[]; equipped?: string; room?: Partial<Record<'plant' | 'wall' | 'toy', string>> }
export const emptyWallet = (): Wallet => ({ coins: 0, day: '', rewardedRuns: [] });
export function awardRun(wallet: Wallet, runId: string, score: number, day: string): { wallet: Wallet; reward: number } {
  const runs = wallet.day === day ? wallet.rewardedRuns : [];
  const reward = runs.includes(runId) || runs.length >= 3 || score <= 0 ? 0 : score >= 15 ? 15 : score >= 8 ? 10 : 5;
  return { wallet: { ...wallet, coins: wallet.coins + reward, day, rewardedRuns: reward ? [...runs, runId] : [...runs] }, reward };
}
export function readWallet(value: unknown): Wallet {
  if (!value || typeof value !== 'object') return emptyWallet();
  const w = value as Wallet;
  if (!(Number.isSafeInteger(w.coins) && w.coins >= 0 && typeof w.day === 'string' && Array.isArray(w.rewardedRuns) && w.rewardedRuns.length <= 3 && w.rewardedRuns.every(id => typeof id === 'string'))) return emptyWallet();
  const owned = Array.isArray(w.owned) ? w.owned.filter(id => decorations.some(item => item.id === id)) : [];
  const room: NonNullable<Wallet['room']> = {};
  for (const slot of ['plant', 'wall', 'toy'] as const) {
    const id = w.room?.[slot];
    if (id && owned.includes(id) && decorations.some(item => item.id === id && item.slot === slot)) room[slot] = id;
  }
  return { coins: w.coins, day: w.day, rewardedRuns: [...w.rewardedRuns], owned: [...new Set(owned)], equipped: owned.includes(w.equipped ?? '') && decorations.some(item => item.id === w.equipped && item.slot === 'rug') ? w.equipped : undefined, ...(Object.keys(room).length ? { room } : {}) };
}
