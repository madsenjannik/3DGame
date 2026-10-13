// @ts-nocheck
import { Events } from './Events.js';

export class GameState {
  events = new Events();
  inventory = new Map([['rare_seed', 0]]);
  player = { characterId: 'succulent', position: { x: 0.6, y: 0, z: 10.8 } };
  objective = { id: 'find_rare_seed', stage: 'find', complete: false };
  choice = { open: false, resolved: false, result: null };
  personal = { rareSpecimenPlanted: false, boatOwned: false, boatRented: false };
  homeAccess = { mode: 'private', allowTeam: false, allowAlliance: false, grants: [] };
  worldProject = { id: 'community_bloom', contributed: 0, target: 3 };

  addItem(id, amount = 1) {
    const next = (this.inventory.get(id) || 0) + amount;
    this.inventory.set(id, next);
    this.events.emit('inventory:changed', { id, amount: next });
  }

  removeItem(id, amount = 1) {
    const current = this.inventory.get(id) || 0;
    if (current < amount) return false;
    const next = current - amount;
    this.inventory.set(id, next);
    this.events.emit('inventory:changed', { id, amount: next });
    return true;
  }

  beginSeedChoice() {
    if (this.choice.open || this.choice.resolved || (this.inventory.get('rare_seed') || 0) < 1) return false;
    this.objective = { id: 'choose_seed_fate', stage: 'choose', complete: false };
    this.choice.open = true;
    this.events.emit('choice:opened', { id: 'rare_seed_fate' });
    this.events.emit('objective:changed', this.objective);
    return true;
  }

  resolveSeedChoice(result) {
    if (!this.choice.open || this.choice.resolved) return false;
    if (result !== 'plant' && result !== 'donate') return false;
    if (!this.removeItem('rare_seed', 1)) return false;

    this.choice.open = false;
    this.choice.resolved = true;
    this.choice.result = result;

    if (result === 'plant') {
      this.personal.rareSpecimenPlanted = true;
      this.events.emit('personal:specimen-planted', { id: 'rare_seed' });
    } else {
      this.worldProject.contributed = Math.min(this.worldProject.target, this.worldProject.contributed + 1);
      this.events.emit('world-project:changed', { ...this.worldProject });
    }

    this.objective = { id: 'first_meaningful_choice', stage: 'complete', complete: true };
    this.events.emit('choice:resolved', { result });
    this.events.emit('objective:complete', { id: this.objective.id, result });
    return true;
  }
}
