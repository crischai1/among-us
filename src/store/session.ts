import { create } from 'zustand';
import type { RoomState } from '../../shared/types';

export type ConnStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting';

interface SessionState {
  status: ConnStatus;
  code: string | null;
  selfId: string | null;
  room: RoomState | null;
  error: string | null;
  set: (p: Partial<SessionState>) => void;
}

export const useSession = create<SessionState>((set) => ({
  status: 'idle',
  code: null,
  selfId: null,
  room: null,
  error: null,
  set: (p) => set(p),
}));
