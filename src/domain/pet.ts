import { kinds, type PetKind } from './onboarding';
export type PetAction = 'feed' | 'play' | 'rest';
export interface PetState { version: 1; kind: PetKind; satiety: number; mood: number; energy: number }
export const initialPet = (kind: PetKind = 'buba'): PetState => ({ version: 1, kind, satiety: 70, mood: 70, energy: 70 });
const clamp = (value: number) => Math.max(0, Math.min(100, value));
export function applyAction(state: PetState, action: PetAction): PetState {
  switch (action) {
    case 'feed': return { ...state, satiety: clamp(state.satiety + 20) };
    case 'play': return { ...state, mood: clamp(state.mood + 15), energy: clamp(state.energy - 10) };
    case 'rest': return { ...state, energy: clamp(state.energy + 20) };
  }
}
export function isPetState(value: unknown): value is PetState {
  if (!value || typeof value !== 'object') return false;
  const pet = value as Record<string, unknown>;
  return pet.version === 1 && kinds.some(kind => kind === pet.kind) && ['satiety', 'mood', 'energy'].every(key => typeof pet[key] === 'number' && Number.isFinite(pet[key]) && Number(pet[key]) >= 0 && Number(pet[key]) <= 100);
}
