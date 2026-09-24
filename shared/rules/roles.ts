import { shuffle, type Rng } from '../rng';
import type { GameSettings } from '../settings';
import { isImpostorRole, type Role } from '../types';

export function maxImpostors(n: number): number {
  if (n <= 6) return 1;
  if (n <= 8) return 2;
  return 3;
}

/**
 * Pick impostors, then roll special roles. `forced` (dev only) pins roles for
 * specific players; the remaining impostor slots are filled randomly.
 */
export function assignRoles(
  ids: string[],
  settings: GameSettings,
  rng: Rng,
  forced: Record<string, Role> = {},
): Record<string, Role> {
  const roles: Record<string, Role> = {};
  const numImp = Math.min(settings.impostors, maxImpostors(ids.length));
  const forcedImps = ids.filter((id) => forced[id] && isImpostorRole(forced[id]));
  const free = shuffle(rng, ids.filter((id) => !forced[id]));
  const slots = Math.max(0, numImp - forcedImps.length);
  const impostors = new Set([...forcedImps, ...free.slice(0, slots)]);

  for (const id of ids) roles[id] = forced[id] ?? (impostors.has(id) ? 'impostor' : 'crewmate');

  const roll = (pool: string[], from: Role, to: Role, count: number, chance: number) => {
    let given = 0;
    for (const id of pool) {
      if (given >= count) break;
      if (roles[id] !== from || forced[id]) continue;
      if (rng() * 100 < chance) {
        roles[id] = to;
        given++;
      }
    }
  };
  const order = shuffle(rng, ids);
  roll(order, 'impostor', 'shapeshifter', settings.shapeshifterCount, settings.shapeshifterChance);
  roll(order, 'crewmate', 'engineer', settings.engineerCount, settings.engineerChance);
  roll(order, 'crewmate', 'scientist', settings.scientistCount, settings.scientistChance);
  return roles;
}
