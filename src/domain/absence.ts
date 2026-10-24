import type { PetState } from './pet';

const hour = 3_600_000;

// Whole hours preserve the existing integer scales; partial hours carry forward.
export function applyAbsence(pet: PetState, lastUpdated: number, now: number) {
  const elapsed = Math.max(0, Math.floor((now - lastUpdated) / hour));
  const hours = Math.min(12, elapsed);
  return {
    pet: {
      ...pet,
      satiety: Math.max(0, pet.satiety - hours * 2),
      mood: Math.max(0, pet.mood - hours),
      energy: Math.min(100, pet.energy + hours * 2),
    },
    updatedAt: lastUpdated + elapsed * hour,
  };
}
