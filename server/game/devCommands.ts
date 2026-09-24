import { spawnPoint } from '../../shared/map';
import type { SabotageKind } from '../../shared/types';
import { startSabotage } from './actions';
import type { Game } from './Game';
import type { SPlayer } from './types';

/** Dev-only cheats for solo playtesting. Enabled when the server runs with DEV=1. */
export function runDevCommand(g: Game, p: SPlayer, raw: string): void {
  const [cmd, ...args] = raw.trim().split(/\s+/);
  const say = (text: string) => g.emit(p, { k: 'notice', text });
  switch (cmd) {
    case 'tp': {
      const room = g.map.def.rooms.find((r) => r.id.toLowerCase() === args[0]?.toLowerCase() || r.name.toLowerCase() === args.join(' ').toLowerCase());
      if (!room) return say(`rooms: ${g.map.def.rooms.map((r) => r.id).join(', ')}`);
      const r = room.rects[0];
      g.teleport(p, r.x + r.w / 2, r.y + r.h - 40);
      return say(`teleported to ${room.name}`);
    }
    case 'noclip':
      p.noclip = !p.noclip;
      return say(`noclip ${p.noclip ? 'on' : 'off'}`);
    case 'killcd':
      p.killReadyAt = g.now;
      g.markPriv(p);
      return say('kill ready');
    case 'sab': {
      const kind = args[0] as SabotageKind;
      if (!['lights', 'reactor', 'o2', 'comms'].includes(kind)) return say('usage: /sab lights|reactor|o2|comms');
      g.sabotage = null;
      startSabotage(g, kind);
      return;
    }
    case 'win':
      g.endGame(args[0] === 'imp' ? 'impostors' : 'crew', 'dev');
      return;
    case 'tasks':
      for (const t of p.tasks) {
        t.done = true;
        t.step = t.stations.length - 1;
      }
      g.markPriv(p);
      g.markPub();
      g.checkWin();
      return;
    case 'meeting':
      if (g.phase === 'playing') g.startMeeting('emergency', p, null);
      return;
    case 'die':
      p.alive = false;
      g.releasePanels(p);
      g.markPub();
      return;
    case 'home': {
      const sp = spawnPoint(g.map.def, p.idx, g.players.length);
      g.teleport(p, sp.x, sp.y);
      return;
    }
    default:
      say('dev: /tp <room> /noclip /killcd /sab <kind> /win crew|imp /tasks /meeting /die /home');
  }
}
