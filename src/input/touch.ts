/** Floating virtual joystick: press anywhere on the world canvas and drag to walk. */
import { useSyncExternalStore } from 'react';

/** Max knob travel from the base, in CSS px. */
export const STICK_RADIUS = 56;
/** Drag distance below which the stick reads as centered. */
const DEADZONE = 12;

export interface Stick {
  /** Base position (where the finger first landed). */
  bx: number;
  by: number;
  /** Knob offset from the base, clamped to STICK_RADIUS. */
  kx: number;
  ky: number;
}

let pointerId: number | null = null;
let stick: Stick | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** True on phones/tablets, so the UI can hide keyboard hints and show touch ones. */
export const isTouchDevice = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

function update(x: number, y: number): void {
  if (!stick) return;
  let kx = x - stick.bx;
  let ky = y - stick.by;
  const len = Math.hypot(kx, ky);
  if (len > STICK_RADIUS) {
    kx = (kx / len) * STICK_RADIUS;
    ky = (ky / len) * STICK_RADIUS;
  }
  stick = { ...stick, kx, ky };
  emit();
}

function release(): void {
  pointerId = null;
  stick = null;
  emit();
}

/** Attach to the world canvas. Mouse input is ignored so desktop clicks behave as before. */
export function installTouchStick(el: HTMLElement): () => void {
  const onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' || pointerId !== null) return;
    e.preventDefault();
    // Drop focus from chat so the on-screen keyboard closes and movement isn't blocked.
    (document.activeElement as HTMLElement | null)?.blur?.();
    pointerId = e.pointerId;
    stick = { bx: e.clientX, by: e.clientY, kx: 0, ky: 0 };
    emit();
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerId === pointerId) update(e.clientX, e.clientY);
  };
  const onUp = (e: PointerEvent) => {
    if (e.pointerId === pointerId) release();
  };
  el.addEventListener('pointerdown', onDown);
  // Track on window so the stick keeps working when the finger slides over HUD elements.
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  window.addEventListener('blur', release);
  return () => {
    el.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    window.removeEventListener('blur', release);
    release();
  };
}

/** Joystick direction snapped to the 8 directions movement supports. */
export function stickInput(): { dx: number; dy: number } {
  if (!stick || Math.hypot(stick.kx, stick.ky) < DEADZONE) return { dx: 0, dy: 0 };
  const sector = Math.round(Math.atan2(stick.ky, stick.kx) / (Math.PI / 4));
  const a = (sector * Math.PI) / 4;
  return { dx: Math.round(Math.cos(a)), dy: Math.round(Math.sin(a)) };
}

export function useStick(): Stick | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => stick,
  );
}

/** Touches that already fired on finger-down; the browser's own click when they lift is swallowed. */
const firedPointers = new Set<number>();
/** Deadlines for swallowing one native click each, set when a fired touch lifts. */
let swallow: number[] = [];

/**
 * Inside `[data-tap]` zones, touch presses fire on finger-down instead of waiting for a click.
 * Browsers only synthesize clicks for a lone tap, so without this you can't hit a button while
 * another finger is steering the joystick.
 */
export function installTapZones(): () => void {
  const onDown = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    const target = e.target as Element;
    if (!target.closest?.('[data-tap]') || target.closest('button:disabled')) return;
    firedPointers.add(e.pointerId);
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: e.clientX, clientY: e.clientY }));
  };
  const onUp = (e: PointerEvent) => {
    // The press may have opened something under the finger (e.g. the map backdrop), so match the
    // follow-up click by timing rather than by target.
    if (firedPointers.delete(e.pointerId)) swallow.push(performance.now() + 500);
  };
  const onCancel = (e: PointerEvent) => firedPointers.delete(e.pointerId);
  const onClick = (e: MouseEvent) => {
    if (!e.isTrusted) return;
    const now = performance.now();
    swallow = swallow.filter((t) => t >= now);
    if (!swallow.length) return;
    swallow.shift();
    e.stopPropagation();
    e.preventDefault();
  };
  // iOS ignores user-scalable=no; a second finger on a button would otherwise pinch-zoom the page.
  const noGesture = (e: Event) => e.preventDefault();
  window.addEventListener('pointerdown', onDown, true);
  window.addEventListener('pointerup', onUp, true);
  window.addEventListener('pointercancel', onCancel, true);
  window.addEventListener('click', onClick, true);
  document.addEventListener('gesturestart', noGesture);
  return () => {
    window.removeEventListener('pointerdown', onDown, true);
    window.removeEventListener('pointerup', onUp, true);
    window.removeEventListener('pointercancel', onCancel, true);
    window.removeEventListener('click', onClick, true);
    document.removeEventListener('gesturestart', noGesture);
    firedPointers.clear();
    swallow = [];
  };
}
