import { applyAction, type PetAction, type PetState } from '../domain/pet';
import type { PetRepository } from '../services/petRepository';
export class PetStore {
  private state: PetState;
  constructor(private repository: PetRepository) { this.state = repository.load(); }
  get snapshot(): PetState { return { ...this.state }; }
  act(action: PetAction): { state: PetState; saved: boolean } {
    this.state = applyAction(this.state, action);
    return { state: this.snapshot, saved: this.repository.save(this.state) };
  }
}
