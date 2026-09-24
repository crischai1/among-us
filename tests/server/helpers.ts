import { Game } from '../../server/game/Game';
import type { ServerMessage } from '../../shared/protocol';
import { DEFAULT_SETTINGS, type GameSettings } from '../../shared/settings';
import type { Role } from '../../shared/types';

export const T0 = 1_000_000;

export function makeGame(n: number, roles: Record<string, Role> = {}, settings: Partial<GameSettings> = {}) {
  const out = new Map<string, ServerMessage[]>();
  const players = Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, color: i }));
  for (const p of players) out.set(p.id, []);
  const g = new Game(
    { players, settings: { ...DEFAULT_SETTINGS, ...settings }, seed: 7, now: T0, forcedRoles: roles },
    (id, msg) => out.get(id)!.push(msg),
  );
  let now = T0;
  const advance = (ms: number) => {
    now += ms;
    g.update(now);
  };
  const last = <K extends ServerMessage['t']>(id: string, t: K) =>
    [...out.get(id)!].reverse().find((m) => m.t === t) as Extract<ServerMessage, { t: K }> | undefined;
  const all = (id: string) => out.get(id)!;
  const act = (id: string, msg: Parameters<Game['handle']>[1]) => g.handle(id, msg, now);
  return { g, out, advance, last, all, act, get now() { return now; } };
}

export function place(g: Game, id: string, x: number, y: number) {
  const p = g.byId.get(id)!;
  p.x = x;
  p.y = y;
}
