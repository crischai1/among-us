import { useEffect, useRef } from 'react';
import { camera, startLoop } from '../render/loop';
import { debugEnabled, debugState } from '../render/debug';
import { installTouchStick, STICK_RADIUS, useStick } from '../input/touch';

export function WorldCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => startLoop(ref.current!), []);
  useEffect(() => installTouchStick(ref.current!), []);

  const toWorld = (e: React.MouseEvent) => {
    const rect = ref.current!.getBoundingClientRect();
    return {
      x: camera.x + (e.clientX - rect.left - rect.width / 2) / camera.zoom,
      y: camera.y + (e.clientY - rect.top - rect.height / 2) / camera.zoom,
    };
  };

  return (
    <>
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
      <Joystick />
    </>
  );
}

function Joystick() {
  const stick = useStick();
  if (!stick) return null;
  return (
    <div className="joystick" style={{ left: stick.bx, top: stick.by, width: STICK_RADIUS * 2, height: STICK_RADIUS * 2 }} aria-hidden>
      <div className="joystick-knob" style={{ transform: `translate(${stick.kx}px, ${stick.ky}px)` }} />
    </div>
  );
}
