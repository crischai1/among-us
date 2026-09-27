import type { ClientMessage, ServerMessage } from '../../shared/protocol';
import { ROLES, type Role } from '../../shared/types';
import { notify, useGame } from '../store/game';
import { useSession } from '../store/session';
import { applySnap, setWorldMap, world } from '../world/world';
import { addClockSample } from './clock';
import { conn } from './connection';

const tokenKey = (code: string) => `au:token:${code}`;
const PREF_NAME = 'au:name';
const PREF_COLOR = 'au:color';
const PREF_HAT = 'au:hat';

function ssGet(k: string): string | null {
  try {
    return sessionStorage.getItem(k);
  } catch {
    return null;
  }
}
function ssSet(k: string, v: string | null): void {
  try {
    if (v === null) sessionStorage.removeItem(k);
    else sessionStorage.setItem(k, v);
  } catch {
    /* storage unavailable */
  }
}

export function savedName(): string {
  try {
    return localStorage.getItem(PREF_NAME) ?? '';
  } catch {
    return '';
  }
}
function saveName(name: string): void {
  try {
    localStorage.setItem(PREF_NAME, name);
  } catch {
    /* storage unavailable */
  }
}

function savedIndex(key: string): number | null {
  try {
    const v = localStorage.getItem(key);
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
}
function saveIndex(key: string, i: number): void {
  try {
    localStorage.setItem(key, String(i));
  } catch {
    /* storage unavailable */
  }
}

/** Pick a colour and remember it for the next room (if it's free there). */
export function pickColor(color: number): void {
  saveIndex(PREF_COLOR, color);
  send({ t: 'setColor', color });
}

export function pickHat(hat: number): void {
  saveIndex(PREF_HAT, hat);
  send({ t: 'setHat', hat });
}

let lastName = '';
let wantRoom: string | null = null;
let retry = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;

export const send = (msg: ClientMessage): void => conn.send(msg);

export function createRoom(name: string): void {
  lastName = name;
  saveName(name);
  useSession.getState().set({ status: 'connecting', error: null });
  send({ t: 'create', name });
}

export function joinRoom(code: string, name: string): void {
  lastName = name;
  saveName(name);
  const c = code.trim().toUpperCase();
  useSession.getState().set({ status: 'connecting', error: null });
  send({ t: 'join', code: c, name, token: ssGet(tokenKey(c)) ?? undefined });
}

export function leaveRoom(): void {
  const code = useSession.getState().code;
  send({ t: 'leave' });
  if (code) ssSet(tokenKey(code), null);
  wantRoom = null;
  conn.close();
  resetClient();
  history.replaceState(null, '', location.pathname);
}

function resetClient(): void {
  useSession.getState().set({ status: 'idle', code: null, selfId: null, room: null });
  useGame.getState().reset();
  setWorldMap('lobby');
}

function devRoleFromUrl(): Role | null {
  const r = new URLSearchParams(location.search).get('role');
  return r && (ROLES as readonly string[]).includes(r) ? (r as Role) : null;
}

function onMessage(msg: ServerMessage): void {
  const session = useSession.getState();
  const game = useGame.getState();
  switch (msg.t) {
    case 'joined':
      retry = 0;
      wantRoom = msg.code;
      ssSet(tokenKey(msg.code), msg.token);
      session.set({ status: 'connected', code: msg.code, selfId: msg.selfId, error: null });
      {
        const q = new URLSearchParams(location.search);
        q.set('room', msg.code);
        history.replaceState(null, '', `?${q.toString().replace(/=(&|$)/g, '$1')}`);
      }
      {
        // Restore saved cosmetics; the server ignores these mid-game or if the colour is taken.
        const color = savedIndex(PREF_COLOR);
        const hat = savedIndex(PREF_HAT);
        if (color !== null) send({ t: 'setColor', color });
        if (hat !== null) send({ t: 'setHat', hat });
      }
      return;
    case 'lobby': {
      const wasInGame = session.room?.inGame;
      session.set({ room: msg.room });
      if (msg.room.dev) {
        const role = devRoleFromUrl();
        if (role && !session.room) send({ t: 'devRole', role });
      }
      if (msg.room.inGame) setWorldMap(msg.room.settings.map ?? 'skeld');
      else {
        setWorldMap('lobby');
        world.speed = 1;
        if (wasInGame) useGame.getState().reset();
      }
      return;
    }
    case 'pub':
      world.closedDoors = Object.keys(msg.state.doors);
      if (session.room) world.speed = session.room.settings.playerSpeed;
      if (msg.state.phase === 'meeting' && game.pub?.phase !== 'meeting') game.set({ overlay: null });
      game.set({ pub: msg.state });
      return;
    case 'priv':
      game.set({ priv: msg.state });
      return;
    case 'snap':
      applySnap(msg);
      return;
    case 'ev':
      onEvent(msg.ev);
      return;
    case 'pong':
      addClockSample(msg.c, msg.s, Date.now());
      return;
    case 'error':
      if (session.status === 'connecting' || session.status === 'reconnecting') {
        // Couldn't (re)join: go back to the home screen.
        wantRoom = null;
        if (session.code) ssSet(tokenKey(session.code), null);
        conn.close();
        resetClient();
        history.replaceState(null, '', location.pathname);
      }
      useSession.getState().set({ error: msg.message });
      setTimeout(() => {
        if (useSession.getState().error === msg.message) useSession.getState().set({ error: null });
      }, 4000);
      return;
    case 'kicked':
      leaveRoom();
      useSession.getState().set({ error: 'You were kicked from the room.' });
      return;
  }
}

function onEvent(ev: import('../../shared/types').GameEvent): void {
  const game = useGame.getState();
  switch (ev.k) {
    case 'chat':
      game.set({ chat: [...game.chat.slice(-99), ev], unread: game.unread + 1 });
      return;
    case 'killed':
      game.set({ killedByColor: ev.killerColor, overlay: null });
      setTimeout(() => useGame.getState().set({ killedByColor: null }), 2600);
      return;
    case 'meeting':
      game.set({ meetingSplash: ev, overlay: null, chat: [] });
      setTimeout(() => useGame.getState().set({ meetingSplash: null }), 2900);
      return;
    case 'vent':
    case 'shift':
      world.effects.push({ kind: ev.k, x: ev.x, y: ev.y, at: performance.now() });
      return;
    case 'notice':
      notify(ev.text);
      return;
    default:
      return;
  }
}

conn.onMessage(onMessage);

conn.onStatus((open) => {
  if (open) {
    if (pingTimer) clearInterval(pingTimer);
    const ping = () => send({ t: 'ping', c: Date.now() });
    ping();
    setTimeout(ping, 300);
    setTimeout(ping, 700);
    pingTimer = setInterval(ping, 2000);
    return;
  }
  if (pingTimer) clearInterval(pingTimer);
  if (!wantRoom) return;
  // Lost connection while in a room: rejoin with our token.
  useSession.getState().set({ status: 'reconnecting' });
  const delay = Math.min(5000, 400 * 2 ** retry++);
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = setTimeout(() => {
    if (!wantRoom) return;
    send({ t: 'join', code: wantRoom, name: lastName || savedName(), token: ssGet(tokenKey(wantRoom)) ?? undefined });
  }, delay);
});

/** On page load, rejoin automatically if this tab already has a seat in ?room=. */
export function autoRejoin(): void {
  const code = new URLSearchParams(location.search).get('room')?.toUpperCase();
  if (code && ssGet(tokenKey(code))) joinRoom(code, savedName());
}
