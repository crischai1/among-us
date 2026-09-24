import { useEffect, useRef } from 'react';
import { camera, startLoop } from '../render/loop';
import { debugEnabled, debugState } from '../render/debug';

export function WorldCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => startLoop(ref.current!), []);

  const toWorld = (e: React.MouseEvent) => {
    const rect = ref.current!.getBoundingClientRect();
    return {
      x: camera.x + (e.clientX - rect.left - rect.width / 2) / camera.zoom,
      y: camera.y + (e.clientY - rect.top - rect.height / 2) / camera.zoom,
    };
  };

  return (
    <canvas
      ref={ref}
      className="world-canvas"
      onMouseMove={debugEnabled ? (e) => (debugState.mouse = toWorld(e)) : undefined}
      onClick={
        debugEnabled
          ? (e) => {
              const p = toWorld(e);
              navigator.clipboard?.writeText(`x: ${Math.round(p.x)}, y: ${Math.round(p.y)}`).catch(() => {});
            }
          : undefined
      }
    />
  );
}
