import { useEffect } from 'react';
import { closeOverlay, doKill, doReport, doUse, doVent, openOverlay, toggleMap } from '../game/actions';
import { installKeyboard, onAction } from '../input/keyboard';
import { installTapZones } from '../input/touch';
import { send } from '../net/session';
import { debugEnabled, debugState } from '../render/debug';
import { useGame } from '../store/game';
import { useSession } from '../store/session';
import { openChat } from './Chat';
import { GameHud } from './GameHud';
import { LobbyHud } from './LobbyHud';
import { Overlays } from './Overlays';
import { WorldCanvas } from './WorldCanvas';

export function RoomView() {
  const inGame = useSession((s) => !!s.room?.inGame);
  const status = useSession((s) => s.status);
  const error = useSession((s) => s.error);
  const notices = useGame((s) => s.notices);

  useEffect(() => {
    const off1 = installKeyboard();
    const off3 = installTapZones();
    const off2 = onAction((k, e) => {
      const game = useGame.getState();
      if (k === 'escape') return closeOverlay();
      if (k === '/') {
        // Also stops Firefox's quick-find from grabbing the key.
        e.preventDefault();
        return openChat();
      }
      if (game.pub?.phase === 'meeting') return;
      switch (k) {
        case 'e':
        case ' ':
          return doUse();
        case 'q':
          return doKill();
        case 'r':
          return doReport();
        case 'v':
          return doVent();
        case 'tab':
        case 'm':
          if (useSession.getState().room?.inGame) toggleMap();
          return;
        case 'f': {
          const priv = game.priv;
          if (priv?.role !== 'shapeshifter' || game.pub?.phase !== 'playing' || game.overlay) return;
          if (priv.shift?.as) send({ t: 'revert' });
          else openOverlay({ kind: 'shift' });
          return;
        }
        case 'g':
          if (debugEnabled) debugState.noFog = !debugState.noFog;
          return;
        case 'n':
          if (debugEnabled) send({ t: 'dev', cmd: 'noclip' });
          return;
      }
    });
    return () => {
      off1();
      off2();
      off3();
    };
  }, []);

  return (
    <div className="room">
      <WorldCanvas />
      {inGame ? <GameHud /> : <LobbyHud />}
      <Overlays />
      <div className="toast-stack">
        {error && <div className="toast bad">{error}</div>}
        {notices.map((n) => (
          <div key={n.id} className="toast">
            {n.text}
          </div>
        ))}
      </div>
      <div className="rotate-hint">↻ Turn your phone sideways for the best view</div>
      {status === 'reconnecting' && <div className="reconnecting">Reconnecting…</div>}
    </div>
  );
}
