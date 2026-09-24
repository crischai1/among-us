import { create } from 'zustand';
import type { ConsoleKind, GameEvent, PrivState, PubState } from '../../shared/types';

export type ChatMsg = Extract<GameEvent, { k: 'chat' }>;

export interface UseTarget {
  kind: 'task' | 'fix' | 'console' | 'button' | 'laptop';
  id: string;
  label: string;
}

export interface Nearby {
  use: UseTarget | null;
  report: number | null;
  kill: number | null;
  vent: string | null;
}

export type Overlay =
  | { kind: 'task'; stationId: string }
  | { kind: 'fix'; stationId: string }
  | { kind: 'console'; console: ConsoleKind }
  | { kind: 'map' }
  | { kind: 'colors' }
  | { kind: 'portableVitals' }
  | { kind: 'shift' }
  | { kind: 'settings' };

interface GameStore {
  pub: PubState | null;
  priv: PrivState | null;
  chat: ChatMsg[];
  unread: number;
  nearby: Nearby;
  overlay: Overlay | null;
  killedByColor: number | null;
  meetingSplash: Extract<GameEvent, { k: 'meeting' }> | null;
  notices: { id: number; text: string }[];
  set: (p: Partial<GameStore>) => void;
  reset: () => void;
}

export const EMPTY_NEARBY: Nearby = { use: null, report: null, kill: null, vent: null };

export const useGame = create<GameStore>((set) => ({
  pub: null,
  priv: null,
  chat: [],
  unread: 0,
  nearby: EMPTY_NEARBY,
  overlay: null,
  killedByColor: null,
  meetingSplash: null,
  notices: [],
  set: (p) => set(p),
  reset: () =>
    set({ pub: null, priv: null, chat: [], unread: 0, nearby: EMPTY_NEARBY, overlay: null, killedByColor: null, meetingSplash: null }),
}));

let noticeId = 0;
export function notify(text: string): void {
  const id = ++noticeId;
  useGame.setState((s) => ({ notices: [...s.notices.slice(-3), { id, text }] }));
  setTimeout(() => useGame.setState((s) => ({ notices: s.notices.filter((n) => n.id !== id) })), 4000);
}
