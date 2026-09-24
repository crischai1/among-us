import { useEffect } from 'react';
import { SABOTAGE_STATIONS } from '../../shared/rules/sabotage';
import { closeOverlay } from '../game/actions';
import { useGame } from '../store/game';
import { useSession } from '../store/session';
import { TaskOverlay } from '../tasks/TaskOverlay';
import { ColorPicker } from './ColorPicker';
import { AdminView, MapOverlay } from './MapOverlay';
import { SabotageFix } from './sabotage/SabotageFix';
import { SecurityView } from './SecurityView';
import { SettingsOverlay } from './SettingsPanel';
import { ShapeshiftPicker } from './ShapeshiftPicker';
import { VitalsView } from './VitalsView';

export function Overlays() {
  const overlay = useGame((s) => s.overlay);
  const pub = useGame((s) => s.pub);
  const priv = useGame((s) => s.priv);
  const inGame = useSession((s) => !!s.room?.inGame);

  // Close panels that no longer make sense.
  useEffect(() => {
    if (!overlay) return;
    if (overlay.kind === 'colors' && inGame) return closeOverlay();
    if (!inGame || overlay.kind === 'settings' || overlay.kind === 'colors') return;
    if (pub && pub.phase !== 'playing') return void useGame.getState().set({ overlay: null });
    if (overlay.kind === 'fix' && (!pub?.sabotage || !SABOTAGE_STATIONS[pub.sabotage.kind].includes(overlay.stationId))) {
      return void useGame.getState().set({ overlay: null });
    }
    if (overlay.kind === 'console' && priv && priv.console !== overlay.console) {
      const t = setTimeout(() => {
        if (useGame.getState().priv?.console !== overlay.console) useGame.getState().set({ overlay: null });
      }, 600);
      return () => clearTimeout(t);
    }
    if (overlay.kind === 'portableVitals' && priv?.battery && !priv.battery.open) {
      const t = setTimeout(() => {
        if (!useGame.getState().priv?.battery?.open) useGame.getState().set({ overlay: null });
      }, 600);
      return () => clearTimeout(t);
    }
  }, [overlay, pub, priv, inGame]);

  if (!overlay) return null;
  switch (overlay.kind) {
    case 'colors':
      return <ColorPicker onClose={closeOverlay} />;
    case 'settings':
      return <SettingsOverlay onClose={closeOverlay} />;
    case 'task':
      return <TaskOverlay stationId={overlay.stationId} />;
    case 'fix':
      return <SabotageFix stationId={overlay.stationId} />;
    case 'map':
      return <MapOverlay />;
    case 'console':
      if (overlay.console === 'cams') return <SecurityView />;
      if (overlay.console === 'admin') return <AdminView />;
      return <VitalsView />;
    case 'portableVitals':
      return <VitalsView portable />;
    case 'shift':
      return <ShapeshiftPicker />;
  }
}
