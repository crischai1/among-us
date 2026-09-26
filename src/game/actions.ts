import { isImpostorRole, type ConsoleKind } from '../../shared/types';
import { serverNow } from '../net/clock';
import { send } from '../net/session';
import { useGame, type Overlay } from '../store/game';
import { useSession } from '../store/session';

const g = () => useGame.getState();

export function openOverlay(o: Overlay | null): void {
  g().set({ overlay: o });
}

/** True while a finished task is waiting to report to the server; closing is deferred. */
let finishing = false;
export function setTaskFinishing(v: boolean): void {
  finishing = v;
}

/** Close whatever panel is open. The server is told by the subscriber below. */
export function closeOverlay(): void {
  if (!g().overlay || finishing) return;
  g().set({ overlay: null });
}

/**
 * However a panel goes away (close button, Esc, completion, sabotage, meeting),
 * tell the server so it never keeps the player locked at a station.
 */
function notifyClosed(prev: Overlay, next: Overlay | null): void {
  if (prev.kind === 'task' || prev.kind === 'fix') {
    if (next && (next.kind === 'task' || next.kind === 'fix') && next.stationId === prev.stationId) return;
    send({ t: 'taskClose' });
  } else if (prev.kind === 'console') {
    if (next?.kind === 'console' && next.console === prev.console) return;
    send({ t: 'console', kind: prev.console, open: false });
  } else if (prev.kind === 'portableVitals' && next?.kind !== 'portableVitals') {
    send({ t: 'portableVitals', open: false });
  }
}

useGame.subscribe((state, prev) => {
  if (prev.overlay && state.overlay !== prev.overlay && useSession.getState().room?.inGame) notifyClosed(prev.overlay, state.overlay);
});

export function doUse(): void {
  const { nearby, overlay } = g();
  const u = nearby.use;
  if (!u || overlay) return;
  switch (u.kind) {
    case 'laptop':
      openOverlay({ kind: 'colors' });
      return;
    case 'task':
      send({ t: 'taskOpen', stationId: u.id });
      openOverlay({ kind: 'task', stationId: u.id });
      return;
    case 'fix':
      send({ t: 'taskOpen', stationId: u.id });
      openOverlay({ kind: 'fix', stationId: u.id });
      return;
    case 'console': {
      const kind = u.id as ConsoleKind;
      send({ t: 'console', kind, open: true });
      openOverlay({ kind: 'console', console: kind });
      return;
    }
    case 'button':
      if (canPressButton()) send({ t: 'emergency' });
      return;
    case 'door':
      openOverlay({ kind: 'door', doorId: u.id });
      return;
  }
}

export function canPressButton(): boolean {
  const { pub, priv } = g();
  if (!pub || !priv) return false;
  if (priv.emergencyLeft <= 0) return false;
  if (pub.sabotage) return false;
  return serverNow() >= pub.buttonReadyAt;
}

export function doKill(): void {
  const { nearby, priv, overlay } = g();
  if (nearby.kill === null || !priv || !isImpostorRole(priv.role) || overlay) return;
  if (serverNow() < priv.killReadyAt) return;
  send({ t: 'kill', target: nearby.kill });
}

export function doReport(): void {
  const { nearby, overlay } = g();
  if (nearby.report === null || overlay) return;
  send({ t: 'report', bodyId: nearby.report });
}

export function doVent(): void {
  const { nearby, priv, overlay } = g();
  if (!priv || overlay) return;
  if (priv.venting) send({ t: 'vent', action: 'exit' });
  else if (nearby.vent && (priv.role !== 'engineer' || serverNow() >= priv.ventReadyAt)) send({ t: 'vent', action: 'enter', ventId: nearby.vent });
}

export function toggleMap(): void {
  const o = g().overlay;
  if (o?.kind === 'map') closeOverlay();
  else if (!o) openOverlay({ kind: 'map' });
}

export function inGamePlaying(): boolean {
  return !!useSession.getState().room?.inGame && g().pub?.phase === 'playing';
}
