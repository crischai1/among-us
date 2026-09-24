import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/app.css';
import './styles/ui.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if (import.meta.env.DEV) {
  // Handy for debugging in the console.
  void Promise.all([import('./store/game'), import('./store/session'), import('./world/world'), import('./net/session')]).then(([g, s, w, n]) => {
    Object.assign(window, { __au: { useGame: g.useGame, useSession: s.useSession, world: w.world, send: n.send } });
  });
}
