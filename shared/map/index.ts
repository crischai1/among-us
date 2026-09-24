import { compileMap, type CompiledMap } from './compile';
import { LOBBY } from './lobby';
import { SKELD } from './skeld';

let ship: CompiledMap | null = null;
let lobby: CompiledMap | null = null;

export const getShip = (): CompiledMap => (ship ??= compileMap(SKELD));
export const getLobby = (): CompiledMap => (lobby ??= compileMap(LOBBY));
export const getMap = (id: 'skeld' | 'lobby'): CompiledMap => (id === 'skeld' ? getShip() : getLobby());

export { compileMap, spawnPoint, type CompiledMap } from './compile';
