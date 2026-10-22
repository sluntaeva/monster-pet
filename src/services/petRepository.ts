import { initialPet, isPetState, type PetState } from '../domain/pet';
export interface PetRepository { load(): PetState; save(state: PetState): boolean }
// Local prototype only. Replace with authenticated API before adding rewards/payments.
export class LocalPetRepository implements PetRepository {
  private key = 'monster-pet:onboarded:v1';
  hasPet(): boolean {
    try { return isPetState(JSON.parse(localStorage.getItem(this.key) ?? 'null')); } catch { return false; }
  }
  load(): PetState {
    try { const value: unknown = JSON.parse(localStorage.getItem(this.key) ?? 'null'); return isPetState(value) ? value : initialPet(); }
    catch { return initialPet(); }
  }
  save(state: PetState): boolean {
    try { localStorage.setItem(this.key, JSON.stringify(state)); return true; } catch { return false; }
  }
}
