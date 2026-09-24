import { isImpostorRole } from '../../shared/types';
import { serverNow } from '../net/clock';
import { send } from '../net/session';
import { useGame, type Overlay } from '../store/game';
import { useSession } from '../store/session';

const g = () => useGame.getState();

export function openOverlay(o: Overlay | null): void {
  g().set({ overlay: o });
}

/** Close whatever panel is open, telling the server if it tracks it. */
export function closeOverlay(): void {
  const o = g().overlay;
  if (!o) return;
  if (o.kind === 'task' || o.kind === 'fix') send({ t: 'taskClose' });
  if (o.kind === 'console') send({ t: 'console', kind: o.console, open: false });
  if (o.kind === 'portableVitals') send({ t: 'portableVitals', open: false });
  g().set({ overlay: null });
}

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
      const kind = u.id as 'cams' | 'admin' | 'vitals';
      send({ t: 'console', kind, open: true });
      openOverlay({ kind: 'console', console: kind });
      return;
    }
    case 'button':
      if (canPressButton()) send({ t: 'emergency' });
      return;
  }
}

export function canPressButton(): boolean {
  const { pub, priv } = g();
  if (!pub || !priv) return false;
  if (priv.emergencyLeft <= 0) return false;
  if (pub.sabotage && (pub.sabotage.kind === 'reactor' || pub.sabotage.kind === 'o2')) return false;
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
