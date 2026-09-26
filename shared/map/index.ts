import { compileMap, type CompiledMap } from './compile';
import { LOBBY } from './lobby';
import { SKELD } from './skeld';

/** Where the world currently is: the pre-game dropship or the ship. */
export type WorldId = 'skeld' | 'lobby';

let ship: CompiledMap | null = null;
let lobby: CompiledMap | null = null;

export const getShip = (): CompiledMap => (ship ??= compileMap(SKELD));
export const getLobby = (): CompiledMap => (lobby ??= compileMap(LOBBY));
export const getMap = (id: WorldId): CompiledMap => (id === 'skeld' ? getShip() : getLobby());

export { compileMap, spawnPoint, type CompiledMap } from './compile';
