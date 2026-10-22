import type { PetAction } from './pet';
import type { PetKind } from './onboarding';
export const friendshipLevels = [
  { xp: 0, title: 'Кто ты?' },
  { xp: 50, title: 'Ладно, оставайся' },
  { xp: 150, title: 'Свой человек' },
  { xp: 300, title: 'Любимый сообщник' },
  { xp: 500, title: 'Мой человек' },
] as const;
export interface Friendship { xp: number; day: string; dailyXp: number; counts: Record<PetAction | 'game', number> }
export function initialFriendship(): Friendship { return { xp: 0, day: '', dailyXp: 0, counts: { feed: 0, play: 0, rest: 0, game: 0 } }; }
export function friendshipLevel(xp: number): number {
  let level = 0;
  for (let i = 1; i < friendshipLevels.length; i++) if (xp >= friendshipLevels[i].xp) level = i;
  return level;
}
export function gainFriendship(previous: Friendship, event: PetAction | 'game', day: string): { friendship: Friendship; xpGain: number; levelUp: boolean } {
  const current = previous.day === day ? previous : { ...initialFriendship(), xp: previous.xp, day };
  const xpGain = Math.max(0, Math.min(event === 'game' ? 10 : 5, 50 - current.dailyXp, 500 - current.xp));
  if (!xpGain || current.counts[event] >= 3) return { friendship: current, xpGain: 0, levelUp: false };
  const friendship = { ...current, xp: current.xp + xpGain, dailyXp: current.dailyXp + xpGain, counts: { ...current.counts, [event]: current.counts[event] + 1 } };
  return { friendship, xpGain, levelUp: friendshipLevel(friendship.xp) > friendshipLevel(previous.xp) };
}
const greetings: Record<PetKind, readonly string[]> = {
  buba: ['Я ещё присматриваюсь к тебе.', 'Ладно. Можешь приходить.', 'Тебя я уже узнаю по шагам.', 'С тобой можно и пошалить. Немного.', 'Мой человек… Я это вслух сказал?'],
  zhuzha: ['Ты кто? Бегать умеешь?', 'Оставайся! Вместе шумнее!', 'О! Мой напарник пришёл!', 'У меня план. Ты отвлекаешь, я нажимаю!', 'Мой человек! Мы с тобой — ураган!'],
  plyukh: ['Ты свет не загораживай.', 'Можешь остаться. Подушка там.', 'Узнаю. Садись, отдохнём.', 'Для тебя сдвинусь. На полподушки.', 'Мой человек. Рядом спится спокойнее.'],
  nyam: ['Ты с угощением или просто так?', 'Оставайся. Крошек на двоих хватит.', 'Своему человеку — кусочек побольше!', 'Запасы проверены. Можно шалить вместе!', 'Мой человек! Держи последнее печенье.'],
};
export function friendshipLine(kind: PetKind, xp: number): string { return greetings[kind][friendshipLevel(xp)]; }
