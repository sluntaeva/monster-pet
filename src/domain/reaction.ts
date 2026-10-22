import type { PetState } from './pet';
export function touchReaction(pet: PetState): 'purr' | 'attack' {
  return Math.min(pet.satiety, pet.mood, pet.energy) < 30 ? 'attack' : 'purr';
}
