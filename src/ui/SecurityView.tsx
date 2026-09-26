import { useEffect, useRef } from 'react';
import { closeOverlay } from '../game/actions';
import { roster } from '../render/loop';
import { renderViewport } from '../render/viewport';
import { useGame } from '../store/game';
import { world } from '../world/world';

export function SecurityView() {
  const refs = useRef<(HTMLCanvasElement | null)[]>([]);
  const commsDown = useGame((s) => !!s.priv?.commsDown);
  useEffect(() => {
    let raf = 0;
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      world.map.cameras.forEach((cam, i) => {
        const c = refs.current[i];
        if (!c) return;
        const ctx = c.getContext('2d')!;
        if (useGame.getState().priv?.commsDown) {
          const img = ctx.createImageData(c.width, c.height);
          for (let p = 0; p < img.data.length; p += 4) {
            const v = Math.random() * 255;
            img.data[p] = img.data[p + 1] = img.data[p + 2] = v;
            img.data[p + 3] = 255;
          }
          ctx.putImageData(img, 0, 0);
          return;
        }
        renderViewport(ctx, cam.view, t, roster(), true);
      });
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="overlay-backdrop" onClick={closeOverlay}>
      <div className="panel security" onClick={(e) => e.stopPropagation()}>
        <button className="close-x" onClick={closeOverlay}>
          ✕
        </button>
        <div className={`cam-grid ${world.map.cameras.length > 4 ? 'many' : ''}`}>
          {world.map.cameras.map((cam, i) => (
            <div key={cam.id} className="cam">
              <canvas ref={(el) => void (refs.current[i] = el)} width={480} height={320} />
              <span className="cam-label">{commsDown ? 'NO SIGNAL' : cam.name}</span>
              {!commsDown && <span className="rec">● REC</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
