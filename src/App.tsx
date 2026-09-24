import { useEffect } from 'react';
import { autoRejoin } from './net/session';
import { useSession } from './store/session';
import { Home } from './ui/Home';
import { RoomView } from './ui/RoomView';

export function App() {
  const code = useSession((s) => s.code);
  const status = useSession((s) => s.status);
  useEffect(() => autoRejoin(), []);
  if (!code || status === 'idle') return <Home />;
  return <RoomView />;
}
