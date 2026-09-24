import type { WebSocket } from 'ws';
import { COLORS } from '../shared/colors';
import {
  GAME_GRACE_MS, LOBBY_GRACE_MS, MAX_NAME_LENGTH, MAX_PLAYERS, MIN_PLAYERS, ROOM_CODE_LENGTH, TICK_MS, CHAT_INTERVAL_MS, MAX_CHAT_LENGTH,
} from '../shared/constants';
import { getLobby, spawnPoint } from '../shared/map';
import type { ClientMessage, ServerMessage } from '../shared/protocol';
import { applySettingsPatch, DEFAULT_SETTINGS, type GameSettings } from '../shared/settings';
import { stepPlayer } from '../shared/sim/movement';
import { ROLES, type EntTuple, type Role, type RoomState } from '../shared/types';
import { Game } from './game/Game';
import { queueInput, takeInputs, type Input } from './game/types';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

export function makeRoomCode(): string {
  let s = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

export function cleanName(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH) : '';
  return s || 'Player';
}

export interface Member {
  id: string;
  name: string;
  color: number;
  token: string;
  ws: WebSocket | null;
  connected: boolean;
  disconnectedAt: number;
  lastChatAt: number;
  /** Dropship avatar */
  eid: number;
  x: number;
  y: number;
  gen: number;
  inputs: Input[];
  lastSeq: number;
}

export function sendWs(ws: WebSocket | null, msg: ServerMessage): void {
  if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

export class ServerRoom {
  readonly members = new Map<string, Member>();
  hostId = '';
  settings: GameSettings = { ...DEFAULT_SETTINGS };
  game: Game | null = null;
  forcedRoles: Record<string, Role> = {};
  private simTime = 0;
  private nextEid = 1;
  private lobbyDirty = true;

  constructor(
    readonly code: string,
    readonly dev: boolean,
  ) {}

  get memberCount(): number {
    return this.members.size;
  }

  send(id: string, msg: ServerMessage): void {
    sendWs(this.members.get(id)?.ws ?? null, msg);
  }

  roomState(): RoomState {
    return {
      code: this.code,
      hostId: this.hostId,
      members: [...this.members.values()].map((m) => ({
        id: m.id,
        name: m.name,
        color: m.color,
        connected: m.connected,
        isHost: m.id === this.hostId,
      })),
      settings: this.settings,
      inGame: !!this.game,
      dev: this.dev,
    };
  }

  private freeColor(): number {
    const used = new Set([...this.members.values()].map((m) => m.color));
    const free = COLORS.map((_, i) => i).filter((i) => !used.has(i));
    return free[Math.floor(Math.random() * free.length)] ?? 0;
  }

  addMember(id: string, token: string, name: string, ws: WebSocket, now: number): Member {
    const sp = spawnPoint(getLobby().def, this.members.size, MAX_PLAYERS);
    const m: Member = {
      id,
      name: cleanName(name),
      color: this.freeColor(),
      token,
      ws,
      connected: true,
      disconnectedAt: 0,
      lastChatAt: 0,
      eid: this.nextEid++,
      x: sp.x,
      y: sp.y,
      gen: 1,
      inputs: [],
      lastSeq: 0,
    };
    this.members.set(id, m);
    if (!this.hostId) this.hostId = id;
    if (this.simTime === 0) this.simTime = now;
    this.lobbyDirty = true;
    return m;
  }

  rebind(m: Member, ws: WebSocket): void {
    if (m.ws && m.ws !== ws) m.ws.close();
    m.ws = ws;
    m.connected = true;
    m.inputs.length = 0;
    m.gen++;
    this.game?.setConnected(m.id, true);
    this.lobbyDirty = true;
  }

  disconnect(ws: WebSocket, now: number): void {
    for (const m of this.members.values()) {
      if (m.ws !== ws) continue;
      m.ws = null;
      m.connected = false;
      m.disconnectedAt = now;
      this.game?.setConnected(m.id, false);
      this.lobbyDirty = true;
    }
  }

  removeMember(id: string): void {
    if (!this.members.delete(id)) return;
    delete this.forcedRoles[id];
    this.game?.removePlayer(id);
    if (this.hostId === id) {
      const next = [...this.members.values()].find((m) => m.connected) ?? [...this.members.values()][0];
      this.hostId = next?.id ?? '';
    }
    this.lobbyDirty = true;
  }

  handle(m: Member, msg: ClientMessage, now: number): void {
    const isHost = m.id === this.hostId;
    switch (msg.t) {
      case 'setColor':
        if (this.game || !Number.isInteger(msg.color) || msg.color < 0 || msg.color >= COLORS.length) return;
        if ([...this.members.values()].some((o) => o !== m && o.color === msg.color)) return;
        m.color = msg.color;
        this.lobbyDirty = true;
        return;
      case 'setSettings':
        if (!isHost || this.game) return;
        this.settings = applySettingsPatch(this.settings, msg.patch);
        this.lobbyDirty = true;
        return;
      case 'kick': {
        if (!isHost || this.game || msg.id === m.id) return;
        const target = this.members.get(msg.id);
        if (!target) return;
        sendWs(target.ws, { t: 'kicked' });
        target.ws?.close();
        this.removeMember(target.id);
        return;
      }
      case 'devRole':
        if (!this.dev) return;
        if (msg.role && ROLES.includes(msg.role)) this.forcedRoles[m.id] = msg.role;
        else delete this.forcedRoles[m.id];
        return;
      case 'start':
        this.start(m, now);
        return;
      case 'input':
        if (this.game) this.game.handle(m.id, msg, now);
        else queueInput(m, msg.seq, msg.dx, msg.dy);
        return;
      case 'chat':
        if (this.game) this.game.handle(m.id, msg, now);
        else this.lobbyChat(m, msg.text, now);
        return;
      default:
        this.game?.handle(m.id, msg, now);
    }
  }

  private lobbyChat(m: Member, raw: unknown, now: number): void {
    if (typeof raw !== 'string' || now - m.lastChatAt < CHAT_INTERVAL_MS) return;
    const text = raw.replace(/\s+/g, ' ').trim().slice(0, MAX_CHAT_LENGTH);
    if (!text) return;
    m.lastChatAt = now;
    for (const o of this.members.values()) {
      sendWs(o.ws, { t: 'ev', ev: { k: 'chat', channel: 'lobby', fromId: m.id, name: m.name, color: m.color, text, dead: false, at: now } });
    }
  }

  start(by: Member, now: number): boolean {
    if (by.id !== this.hostId || this.game) return false;
    const players = [...this.members.values()].filter((m) => m.connected);
    if (players.length < (this.dev ? 1 : MIN_PLAYERS)) {
      sendWs(by.ws, { t: 'error', message: `Need at least ${MIN_PLAYERS} players to start` });
      return false;
    }
    this.game = new Game(
      {
        players: players.map((m) => ({ id: m.id, name: m.name, color: m.color })),
        settings: { ...this.settings },
        seed: Math.floor(Math.random() * 2 ** 31),
        now,
        dev: this.dev,
        forcedRoles: this.dev ? this.forcedRoles : undefined,
      },
      (id, msg) => this.send(id, msg),
    );
    // Anyone disconnected at start is left out of the match.
    for (const m of this.members.values()) if (!m.connected) this.removeMember(m.id);
    this.lobbyDirty = true;
    return true;
  }

  tick(now: number): void {
    // Grace periods
    for (const m of [...this.members.values()]) {
      if (m.connected) continue;
      const grace = this.game ? GAME_GRACE_MS : LOBBY_GRACE_MS;
      if (now - m.disconnectedAt > grace) this.removeMember(m.id);
    }

    if (this.game) {
      this.game.update(now);
      if (this.game.finished) {
        this.game = null;
        this.resetLobby();
      }
    } else {
      this.tickLobby(now);
    }

    if (this.lobbyDirty) {
      this.lobbyDirty = false;
      const room = this.roomState();
      for (const m of this.members.values()) sendWs(m.ws, { t: 'lobby', room });
    }
  }

  private resetLobby(): void {
    let i = 0;
    for (const m of this.members.values()) {
      const sp = spawnPoint(getLobby().def, i++, MAX_PLAYERS);
      m.x = sp.x;
      m.y = sp.y;
      m.gen++;
      m.inputs.length = 0;
    }
    this.lobbyDirty = true;
  }

  private tickLobby(now: number): void {
    const map = getLobby();
    if (now - this.simTime > 1000) this.simTime = now - TICK_MS;
    while (this.simTime + TICK_MS <= now) {
      this.simTime += TICK_MS;
      for (const m of this.members.values()) {
        for (const inp of takeInputs(m)) {
          stepPlayer(m, inp.dx, inp.dy, { map, doors: [], speed: 1, noclip: false });
          m.lastSeq = inp.seq;
        }
      }
    }
    const list = [...this.members.values()];
    const ents: EntTuple[] = list.map((m, i) => [m.eid, Math.round(m.x * 10) / 10, Math.round(m.y * 10) / 10, m.connected ? 0 : 8, i]);
    for (const m of list) {
      if (!m.ws) continue;
      sendWs(m.ws, {
        t: 'snap',
        time: now,
        ack: m.lastSeq,
        gen: m.gen,
        you: [m.x, m.y, 0],
        ents: ents.filter((e) => e[0] !== m.eid),
        bodies: [],
      });
    }
  }
}
