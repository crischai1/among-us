import type { MapId } from '../settings';
import { compileMap, type CompiledMap } from './compile';
import { LOBBY } from './lobby';
import { MIRA } from './mira';
import { POLUS } from './polus';
import { SKELD } from './skeld';
import type { MapDef } from './types';

/** Where the world currently is: the pre-game dropship or one of the ships. */
export type WorldId = MapId | 'lobby';

/** The playable maps, in the order the settings list them. */
export const MAPS: Record<MapId, MapDef> = { skeld: SKELD, mira: MIRA, polus: POLUS };

const compiled = new Map<WorldId, CompiledMap>();

export const getMap = (id: WorldId): CompiledMap => {
  let m = compiled.get(id);
  if (!m) compiled.set(id, (m = compileMap(id === 'lobby' ? LOBBY : (MAPS[id] ?? SKELD))));
  return m;
};
/** The Skeld. */
export const getShip = (): CompiledMap => getMap('skeld');
export const getLobby = (): CompiledMap => getMap('lobby');

export { compileMap, mapShapes, roomLabel, spawnPoint, type CompiledMap } from './compile';
