import type { PetAction } from './pet';

export interface DailyQuest { day: string; actions: PetAction[]; rewarded: boolean }
export const initialDailyQuest = (): DailyQuest => ({ day: '', actions: [], rewarded: false });
export function dailyQuestForDay(quest: DailyQuest, day: string): DailyQuest {
  return quest.day === day ? { ...quest, actions: [...quest.actions] } : { day, actions: [], rewarded: false };
}
export function advanceDailyQuest(quest: DailyQuest, action: PetAction, day: string) {
  const next = dailyQuestForDay(quest, day);
  if (!next.actions.includes(action)) next.actions.push(action);
  const reward = next.actions.length === 3 && !next.rewarded ? 10 : 0;
  if (reward) next.rewarded = true;
  return { quest: next, reward };
}
